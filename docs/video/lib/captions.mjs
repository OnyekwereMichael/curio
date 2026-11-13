// Turns the measured narration timeline (voiceover-timing.json) into caption chunks and SRT text.
// One timeline = what is spoken and exactly when, so captions always match the audio.
const wc = (t) => t.trim().split(/\s+/).length;

export function captionize(beats, maxLine = 38) {
  const chunks = [];
  for (const b of beats) {
    const from = b.start + 0.05;
    const to = b.start + b.sec - 0.15;
    const caps = [];
    let lines = [''];
    const flush = () => {
      const text = lines.filter(Boolean).join('\n');
      if (text) caps.push(text);
      lines = [''];
    };
    for (const w of b.text.split(/\s+/)) {
      let last = lines[lines.length - 1];
      if (last && (last + ' ' + w).length > maxLine) {
        if (lines.length === 2) flush();
        else lines.push('');
        last = lines[lines.length - 1];
      }
      lines[lines.length - 1] = last ? last + ' ' + w : w;
      if (/[.?!]$/.test(w) && lines.join(' ').trim().length >= 24) flush();
    }
    flush();
    if (caps.length > 1 && wc(caps.at(-1)) <= 1) caps.splice(-2, 2, caps.at(-2) + ' ' + caps.at(-1)); // no one-word orphans
    const total = caps.reduce((n, c) => n + wc(c), 0);
    let t = from;
    for (const c of caps) {
      const d = ((to - from) * wc(c)) / total;
      chunks.push({ from: t, to: t + d, text: c });
      t += d;
    }
  }
  return chunks;
}

const srtTime = (s) => {
  const ms = Math.round(s * 1000);
  const f = (n, w) => String(n).padStart(w, '0');
  return `${f(Math.floor(ms / 3600000), 2)}:${f(Math.floor(ms / 60000) % 60, 2)}:${f(Math.floor(ms / 1000) % 60, 2)},${f(ms % 1000, 3)}`;
};

export const toSrt = (chunks) => chunks.map((c, i) => `${i + 1}\n${srtTime(c.from)} --> ${srtTime(c.to)}\n${c.text}\n`).join('\n');
