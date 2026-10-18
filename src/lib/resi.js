import { randomInt } from "node:crypto";
import { RESI_ALPHABET } from "./resi-format.js";

export { isValidResi, normalizeResi, RESI_ALPHABET, RESI_PATTERN } from "./resi-format.js";

function block(length) {
  let out = "";
  for (let i = 0; i < length; i += 1) out += RESI_ALPHABET[randomInt(RESI_ALPHABET.length)];
  return out;
}

/** Resi acak (CSPRNG), tidak berurutan sehingga tidak bisa ditebak dari resi lain. */
export function generateResi() {
  return `RL-${block(4)}-${block(4)}`;
}
