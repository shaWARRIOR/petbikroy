/* ==========================================================================
   PetBikroy — automated ad moderation

   The human moderators in the panel review ads that arrive `pending`. This
   module is the *first* reviewer: every new ad is screened automatically before
   it ever reaches a person, so obvious junk is caught at posting time instead
   of piling up in the queue.

   `scoreAd()` is pure — it looks only at the text and price the poster typed —
   and returns a decision plus the reasons behind it. Callers that can see the
   rest of the database (e.g. to spot a duplicate) pass the extra facts in.

   The checks are intentionally conservative. A listing that merely looks
   unpolished should be held for a human, not auto-rejected; only clear fraud or
   spam signals trip a rejection.
   ========================================================================== */

/** Maximum fraction of an ad that may be upper case before it is "shouting". */
const MAX_UPPER_RATIO = 0.6;
/** A run of repeated punctuation is spam, not language. */
const REPEATED_PUNCT_RE = /(.)\1{6,}/;
/** More than this many exclamation marks reads as spam. */
const MAX_EXCLAMATIONS = 5;
/** A URL somewhere in the body is unusual for a classifieds ad. */
const URL_RE = /(?:https?:\/\/|www\.)[a-z0-9.-]+(?:\/[^\s<])+/i;

/**
 * Runs the automated checks against a validated ad.
 *
 * @param {object} ad  the validated ad from `validateAd()`
 * @param {{isDuplicate?: boolean}} [extra]
 * @returns {{decision: string, reasons: string[]}}
 *   decision is one of 'approved' | 'held' | 'rejected'
 */
export function scoreAd(ad, extra = {}) {
  const reasons = [];
  let score = 0;

  const { title = '', description = '' } = ad || {};
  const body = `${title}\n${description}`;

  // ---- fraud: anything that tries to take the conversation off-site ----
  const offSite = extractOffSiteSignals(description, title);
  if (offSite.length) {
    score += 3;
    reasons.push(`Looks like an attempt to move off the site: ${offSite.join(', ')}`);
  }

  // ---- fraud: disallowed categories ----
  const disallowed = findMatch(body, /(?:adult|escort|brokerage|crypto|bitcoin|investment\s+scheme|loan\s+lending|gambling)\b/i);
  if (disallowed) {
    score += 3;
    reasons.push(`This kind of listing is not allowed here (${disallowed}).`);
  }

  // ---- spam: duplicated content ----
  if (extra.isDuplicate) {
    score += 2;
    reasons.push('A nearly identical ad was posted recently from this account.');
  }

  // ---- spam: shouting, URLs, symbol runs ----
  const upper = upperRatio(body);
  if (upper > MAX_UPPER_RATIO && body.trim().length >= 20) {
    score += 1;
    reasons.push('Almost the whole ad is in capital letters.');
  }
  if (URL_RE.test(description)) {
    score += 1;
    reasons.push('A web link appears in the listing.');
  }
  if (REPEATED_PUNCT_RE.test(body)) {
    score += 1;
    reasons.push('The listing contains long runs of repeated characters.');
  }
  if ((description.match(/!/g) || []).length > MAX_EXCLAMATIONS) {
    score += 1;
    reasons.push('Too many exclamation marks.');
  }

  // ---- too short to be real (validation already enforces a minimum, but a
  //      poster can paste the same text into every field) ----
  if (body.trim().length < 40) {
    score += 1;
    reasons.push('The listing looks too short to describe an animal.');
  }

  // ---- decide ----
  // Rejection needs a strong, clear signal. Anything less is held for a human,
  // who can always spot the nuance a heuristic misses.
  let decision;
  if (score >= 3) decision = 'rejected';
  else if (score >= 1) decision = 'held';
  else decision = 'approved';

  return { decision, reasons };
}

/**
 * Whether the automated review cleared the ad. Used by the posting route to
 * decide whether an ad can skip the queue.
 */
export function isApproved(result) {
  return result && result.decision === 'approved';
}

/* ------------------------------------------------------------------ helpers */

function extractOffSiteSignals(description, title) {
  const out = [];
  const hay = `${description || ''} ${title || ''}`;
  if (/whatsapp|telegram|signal|discord/i.test(hay)) out.push('off-site messaging app');
  if (/(?<!\w)[0-9]{8,15}(?!\w)/.test(hay)) out.push('a phone number');
  if (/[\w.+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(hay)) out.push('an email address');
  if (/wa\.me|bkash|nagad|paypal/i.test(hay)) out.push('a payment link');
  return out;
}

function findMatch(text, re) {
  const m = text.match(re);
  return m ? m[1] || m[0] : null;
}

/** Fraction of alphabetic characters that are upper case. */
function upperRatio(text) {
  const letters = (text.match(/[a-zA-Z]/g) || []);
  if (!letters.length) return 0;
  const upper = letters.filter(c => c >= 'A' && c <= 'Z').length;
  return upper / letters.length;
}
