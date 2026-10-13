// Site-wide constants. Edit these for your own deployment.

/** Public GitHub repository URL. Leave empty to hide the GitHub button. */
export const GITHUB_REPO_URL = 'https://github.com/AkaneKanzaki/Kasaneru';

/** Contact address shown in the Privacy Policy & Terms of Use. */
export const CONTACT_EMAIL = 'shinzex4@gmail.com';

// --- Tamper-evidence secrets -----------------------------------------------
// These are NOT cryptographic security: they only deter casual tampering
// (reading answer keys from the bundle, hand-editing a backup to fake
// results). The keys are visible in this open-source repo, and with 4
// answer options any hash is brute-forceable. Documented honestly in
// src/lib/hash.ts. KEEP IN SYNC with scripts/build-questions.mjs.

/** Salt mixed into answer hashes at build time. */
export const ANSWER_SALT = 'kasaneru-answer-salt-v1';

/** Key signing exam records stored in history. */
export const RECORD_SIGN_KEY = 'kasaneru-record-sign-v1';
