// Builds the wording for the "a shield protected your streak" notice.
// Kept as a plain function so the wording can be tested without any UI.

export function getShieldSavedMessage(shieldsUsed: number, shieldsLeft: number) {
  if (shieldsUsed <= 1) {
    return {
      title: 'A shield protected your streak.',
      detail:
        shieldsLeft > 0
          ? `You have ${shieldsLeft} left.`
          : 'That was your last one. Keep your streak going to earn another.',
    };
  }

  return {
    title: `${shieldsUsed} shields protected your streak.`,
    detail:
      `They covered ${shieldsUsed} missed days. ` +
      (shieldsLeft > 0
        ? `You have ${shieldsLeft} left.`
        : "You're out of shields now. Keep going to earn another."),
  };
}