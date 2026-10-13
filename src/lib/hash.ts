// Tiny non-cryptographic hashes for tamper-EVIDENCE (not tamper-PROOF).
//
// Threat model, stated honestly:
// - Stops casual tampering: reading answer keys straight from the question
//   bundle, or editing a backup JSON in a text editor to fake results.
// - Does NOT stop a determined attacker: with only 4 answer options, any
//   hash can be brute-forced in microseconds, and the embedded keys below
//   are visible in this open-source repo. Real anti-cheat needs
//   server-side grading, which this offline-first app deliberately avoids.
//
// cyrb53 is used because it is small, synchronous, dependency-free, and
// behaves identically in Node (build scripts) and browsers — no secure-
// context requirement like WebCrypto. KEEP IN SYNC with the copy inside
// scripts/build-questions.mjs.

/** cyrb53 hash → 53-bit hex string. */
export function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

/** Keyed hash for tamper-evidence. */
export function keyedHash(key: string, message: string): string {
  return cyrb53(`${key}::${message}`, cyrb53(key).length);
}
