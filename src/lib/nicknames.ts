const adjectives = [
  "cosmic", "neon", "swift", "lunar", "cyber", "pixel", "turbo", "hyper",
  "mega", "ultra", "nano", "zen", "epic", "nova", "spark", "blaze",
  "frost", "storm", "thunder", "shadow", "ruby", "jade", "amber", "coral",
  "vivid", "bold", "brave", "chill", "cool", "dope", "fresh", "keen",
];

const nouns = [
  "panda", "fox", "hawk", "wolf", "tiger", "otter", "koala", "falcon",
  "lynx", "raven", "cobra", "phoenix", "dragon", "ninja", "samurai", "pirate",
  "wizard", "knight", "rocket", "comet", "orbit", "nebula", "atom", "quark",
  "photon", "prism", "cipher", "pulse", "byte", "pixel", "glitch", "spark",
];

export function generateNickname(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${adj}_${noun}${num}`;
}
