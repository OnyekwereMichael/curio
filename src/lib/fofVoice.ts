import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './superbase';

/**
 * Voice chat for a game room: peer-to-peer audio over WebRTC, one connection per pair of players (a full mesh, fine for 8).
 * Audio never touches our servers. Supabase Realtime is used only to swap the connection handshakes (signalling) and to
 * know who is in voice (presence). Everything here is opt-in: nothing starts until the player taps "Join voice", and
 * a failure in voice can never affect the game itself.
 *
 * Networks: STUN servers (free, public) cover most home/Wi-Fi connections. Some mobile networks block direct
 * connections, and for those a TURN relay is needed. Set VITE_TURN_URL / VITE_TURN_USERNAME / VITE_TURN_CREDENTIAL to enable one.
 */

const STUN: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

function iceServers(): RTCIceServer[] {
  const env = import.meta.env as Record<string, string | undefined>;
  if (env.VITE_TURN_URL) {
    return [...STUN, { urls: env.VITE_TURN_URL.split(','), username: env.VITE_TURN_USERNAME, credential: env.VITE_TURN_CREDENTIAL }];
  }
  return STUN;
}

type Signal =
  | { from: string; to: string; kind: 'offer' | 'answer'; sdp: RTCSessionDescriptionInit }
  | { from: string; to: string; kind: 'ice'; candidate: RTCIceCandidateInit };

interface Peer {
  pc: RTCPeerConnection;
  pendingIce: RTCIceCandidateInit[];
  audio: HTMLAudioElement;
  stopMeter?: () => void;
}

export interface VoiceSnapshot {
  joined: boolean;
  /** Mic is open (only meaningful once joined). */
  micOn: boolean;
  /** The player joined without a microphone (blocked or missing): they can hear but not speak. */
  listenOnly: boolean;
  joining: boolean;
  error: string | null;
  /** Everyone currently in voice (including me). */
  inVoice: string[];
  /** Players whose audio is connected to me right now. */
  connected: string[];
  speaking: string[];
}

const EMPTY: VoiceSnapshot = { joined: false, micOn: false, listenOnly: false, joining: false, error: null, inVoice: [], connected: [], speaking: [] };

export class FofVoice {
  private channel: RealtimeChannel | null = null;
  private stream: MediaStream | null = null;
  private peers = new Map<string, Peer>();
  private audioCtx: AudioContext | null = null;
  private speakingSet = new Set<string>();
  private meters = new Map<string, () => boolean>();
  private meterTimer: ReturnType<typeof setInterval> | null = null;
  private snap: VoiceSnapshot = EMPTY;
  private gen = 0; // bumps on every join/leave so late async callbacks can tell they are stale

  private roomId: string;
  private userId: string;
  private onChange: (s: VoiceSnapshot) => void;

  constructor(roomId: string, userId: string, onChange: (s: VoiceSnapshot) => void) {
    this.roomId = roomId;
    this.userId = userId;
    this.onChange = onChange;
  }

  private set(patch: Partial<VoiceSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.onChange(this.snap);
  }

  private publishPeers() {
    const connected = [...this.peers.entries()].filter(([, p]) => p.pc.connectionState === 'connected').map(([id]) => id);
    this.set({ connected });
  }

  /** Joins the voice chat. Asks for the microphone; if that is refused, joins as a listener. */
  async join(): Promise<void> {
    if (this.snap.joined || this.snap.joining) return;
    const gen = ++this.gen;
    this.set({ joining: true, error: null });

    let listenOnly = false;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      listenOnly = true; // permission denied / no microphone: still let them hear everyone
    }
    if (gen !== this.gen) {
      this.stopStream();
      return;
    }

    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) this.audioCtx = new Ctor();
      if (this.audioCtx?.state === 'suspended') void this.audioCtx.resume();
      if (this.stream && this.audioCtx) this.addMeter(this.userId, this.stream, true);

      const channel = supabase.channel(`fof-voice:${this.roomId}`, { config: { presence: { key: this.userId }, broadcast: { self: false } } });
      this.channel = channel;
      channel
        .on('broadcast', { event: 'sig' }, ({ payload }) => void this.onSignal(payload as Signal))
        .on('presence', { event: 'sync' }, () => this.syncPresence())
        .on('presence', { event: 'leave' }, ({ key }) => this.dropPeer(String(key)));

      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout')), 10000);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(t);
            resolve();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(t);
            reject(new Error(status));
          }
        });
      });
      if (gen !== this.gen) return;
      await channel.track({ at: Date.now() });
      this.meterTimer = setInterval(() => this.pollMeters(), 150);
      this.set({ joined: true, joining: false, micOn: !!this.stream, listenOnly });
      this.syncPresence();
    } catch (e) {
      console.warn('voice join failed', e);
      this.leave();
      this.set({ error: 'Could not connect voice chat. Check your connection and try again.' });
    }
  }

  setMic(on: boolean) {
    if (!this.stream) return;
    this.stream.getAudioTracks().forEach((t) => (t.enabled = on));
    this.set({ micOn: on });
  }

  leave() {
    this.gen++;
    if (this.meterTimer) clearInterval(this.meterTimer);
    this.meterTimer = null;
    for (const id of [...this.peers.keys()]) this.dropPeer(id);
    this.meters.clear();
    this.speakingSet.clear();
    if (this.channel) {
      void this.channel.untrack();
      void supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.stopStream();
    void this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
    this.snap = EMPTY;
    this.onChange(this.snap);
  }

  // ───────── who is in voice, and who calls whom ─────────
  private syncPresence() {
    if (!this.channel) return;
    const ids = Object.keys(this.channel.presenceState());
    this.set({ inVoice: ids });
    for (const id of ids) {
      // Exactly one side of each pair makes the offer (the smaller id), so the two never collide.
      if (id !== this.userId && !this.peers.has(id) && this.userId < id) void this.call(id);
    }
    for (const id of [...this.peers.keys()]) if (!ids.includes(id)) this.dropPeer(id);
  }

  private createPeer(peerId: string): Peer {
    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    const audio = new Audio();
    audio.autoplay = true;
    audio.setAttribute('playsinline', 'true');
    const peer: Peer = { pc, pendingIce: [], audio };
    this.peers.set(peerId, peer);

    const mic = this.stream?.getAudioTracks()[0];
    if (mic && this.stream) pc.addTrack(mic, this.stream);
    else pc.addTransceiver('audio', { direction: 'recvonly' });

    pc.onicecandidate = (e) => {
      if (e.candidate) this.send({ from: this.userId, to: peerId, kind: 'ice', candidate: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => {
      const remote = e.streams[0] ?? new MediaStream([e.track]);
      audio.srcObject = remote;
      void audio.play().catch(() => {});
      if (this.audioCtx) this.addMeter(peerId, remote, false);
    };
    pc.onconnectionstatechange = () => {
      this.publishPeers();
      if (pc.connectionState === 'failed') {
        // Could not connect (usually a restrictive network without a TURN relay). Drop it; presence will retry on re-join.
        console.warn('voice: connection to a player failed');
      }
    };
    return peer;
  }

  private async call(peerId: string) {
    const peer = this.createPeer(peerId);
    try {
      const offer = await peer.pc.createOffer();
      await peer.pc.setLocalDescription(offer);
      this.send({ from: this.userId, to: peerId, kind: 'offer', sdp: offer });
    } catch (e) {
      console.warn('voice offer failed', e);
      this.dropPeer(peerId);
    }
  }

  private async onSignal(sig: Signal) {
    if (!sig || sig.to !== this.userId || sig.from === this.userId) return;
    try {
      if (sig.kind === 'offer') {
        this.dropPeer(sig.from); // a fresh offer replaces any stale connection
        const peer = this.createPeer(sig.from);
        await peer.pc.setRemoteDescription(sig.sdp);
        await this.flushIce(peer);
        const answer = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(answer);
        this.send({ from: this.userId, to: sig.from, kind: 'answer', sdp: answer });
      } else if (sig.kind === 'answer') {
        const peer = this.peers.get(sig.from);
        if (!peer || peer.pc.signalingState !== 'have-local-offer') return;
        await peer.pc.setRemoteDescription(sig.sdp);
        await this.flushIce(peer);
      } else if (sig.kind === 'ice') {
        const peer = this.peers.get(sig.from);
        if (!peer) return;
        if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(sig.candidate);
        else peer.pendingIce.push(sig.candidate); // arrived before the offer/answer: hold it
      }
    } catch (e) {
      console.warn('voice signal failed', e);
    }
  }

  private async flushIce(peer: Peer) {
    for (const c of peer.pendingIce.splice(0)) await peer.pc.addIceCandidate(c).catch(() => {});
  }

  private send(sig: Signal) {
    void this.channel?.send({ type: 'broadcast', event: 'sig', payload: sig });
  }

  private dropPeer(id: string) {
    const peer = this.peers.get(id);
    if (!peer) return;
    this.peers.delete(id);
    this.meters.delete(id);
    this.speakingSet.delete(id);
    peer.pc.onconnectionstatechange = null;
    peer.pc.close();
    peer.audio.srcObject = null;
    this.publishPeers();
  }

  private stopStream() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  // ───────── "who is talking" indicator ─────────
  private addMeter(id: string, stream: MediaStream, isMe: boolean) {
    if (!this.audioCtx) return;
    try {
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 512;
      this.audioCtx.createMediaStreamSource(stream).connect(analyser); // analyser is not connected to the speakers: no echo
      const data = new Uint8Array(analyser.fftSize);
      this.meters.set(id, () => {
        if (isMe && !this.snap.micOn) return false;
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
        return peak > 10;
      });
    } catch {
      // metering is cosmetic; never let it break audio
    }
  }

  private pollMeters() {
    let changed = false;
    for (const [id, isLoud] of this.meters) {
      const loud = isLoud();
      if (loud !== this.speakingSet.has(id)) {
        if (loud) this.speakingSet.add(id);
        else this.speakingSet.delete(id);
        changed = true;
      }
    }
    if (changed) this.set({ speaking: [...this.speakingSet] });
  }
}

/** React wrapper: one voice session per room, cleaned up when the page closes. */
export function useFofVoice(roomId: string | null, userId: string | undefined) {
  const [state, setState] = useState<VoiceSnapshot>(EMPTY);
  const voice = useRef<FofVoice | null>(null);

  useEffect(() => {
    if (!roomId || !userId) return;
    const v = new FofVoice(roomId, userId, setState);
    voice.current = v;
    return () => {
      v.leave();
      voice.current = null;
    };
  }, [roomId, userId]);

  const join = useCallback(() => void voice.current?.join(), []);
  const leave = useCallback(() => voice.current?.leave(), []);
  const setMic = useCallback((on: boolean) => voice.current?.setMic(on), []);
  return { voice: state, join, leave, setMic };
}
