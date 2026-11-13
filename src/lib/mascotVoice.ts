import { MASCOT_VOICE, type MascotMood } from './mascotConfig';

const EMOJI = /[\p{Extended_Pictographic}️‍]/gu;

const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * Let the mascot talk, using the browser's built-in speech (no audio files, no
 * network). Emoji are dropped, pitch/speed follow the mood, and a new line
 * replaces any still being spoken. Browsers only allow speech after the user has
 * interacted with the page once, so before that this is silently a no-op.
 */
export function speakAloud(text: string, mood: MascotMood) {
  if (!supported()) return;
  const clean = text.replace(EMOJI, '').replace(/\s+/g, ' ').trim();
  if (!clean) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  const { pitch, rate } = MASCOT_VOICE[mood];
  utterance.pitch = pitch;
  utterance.rate = rate;
  utterance.volume = 0.85;
  synth.speak(utterance);
}

export function stopSpeaking() {
  if (supported()) window.speechSynthesis.cancel();
}
