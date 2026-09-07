// Change the version whenever ranked duration, scoring, or permitted inputs change.
// Existing versions keep their own storage; never migrate scores between rules.
export const rangeRules = Object.freeze({ rulesVersion: 'controller-20s-v2', durationSeconds: 20 });
