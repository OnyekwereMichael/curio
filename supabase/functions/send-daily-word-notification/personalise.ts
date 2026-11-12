// Builds the push message for someone's own words today. Plain function so it
// can be tested alone.

export function wordMessage(words: string[]): { title: string; body: string } {
  const [a, b] = words;
  const rest = words.length - 2;

  if (words.length === 1) {
    return { title: "Curio · Your word today", body: `${a} is waiting for you — tap to learn it.` };
  }
  if (words.length === 2) {
    return { title: "Curio · Your words today", body: `${a} and ${b} are waiting for you.` };
  }
  return {
    title: "Curio · Your words today",
    body: `${a}, ${b} and ${rest} more ${rest === 1 ? "word is" : "words are"} waiting for you.`,
  };
}
