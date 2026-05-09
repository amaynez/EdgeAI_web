export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const LINKEDIN_REGEX = /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9_.\-@]+\/?$/;
export const GENERIC_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];

// Allowed enum values for the three qualification questions.
export const Q1_VALUES = ['amazon', 'walmart', 'both', 'other'] as const;
export const Q2_VALUES = ['under5', '5to15', 'over15', 'unsure'] as const;
export const Q3_VALUES = ['yes_significant', 'somewhat', 'no', 'unsure'] as const;

export type Q1Value = typeof Q1_VALUES[number];
export type Q2Value = typeof Q2_VALUES[number];
export type Q3Value = typeof Q3_VALUES[number];

export function validateLeadPayload(data: Record<string, unknown>): string[] {
  const errors: string[] = [];

  // --- Required string fields ---
  const stringFields: Array<{ key: string; maxLen: number }> = [
    { key: 'name',    maxLen: 100 },
    { key: 'email',   maxLen: 254 },
    { key: 'company', maxLen: 150 },
    { key: 'role',    maxLen: 100 },
  ];

  // --- LinkedIn validation based on email domain ---
  let isGenericEmail = false;
  if (typeof data.email === 'string' && data.email.includes('@')) {
    const emailDomain = data.email.split('@')[1]?.toLowerCase();
    if (emailDomain && GENERIC_DOMAINS.includes(emailDomain)) {
      isGenericEmail = true;
    }
  }

  const linkedinVal = data.linkedin;
  if (isGenericEmail) {
    if (!linkedinVal || typeof linkedinVal !== 'string' || linkedinVal.trim() === '') {
      errors.push('"linkedin" is required for generic email providers.');
    }
  }

  if (linkedinVal !== undefined && linkedinVal !== null && linkedinVal !== '') {
    if (typeof linkedinVal !== 'string') {
      errors.push(`"linkedin" must be a string.`);
    } else {
      const trimmedLinkedin = linkedinVal.trim();
      if (trimmedLinkedin.length > 255) {
        errors.push(`"linkedin" must be at most 255 characters.`);
      }
      if (!LINKEDIN_REGEX.test(trimmedLinkedin)) {
        errors.push('"linkedin" must be a valid LinkedIn profile URL.');
      }
    }
  }

  for (const { key, maxLen } of stringFields) {
    const val = data[key];
    if (!val || typeof val !== 'string' || val.trim() === '') {
      errors.push(`"${key}" is required.`);
    } else if (val.length > maxLen) {
      errors.push(`"${key}" must be at most ${maxLen} characters.`);
    }
  }

  // --- Email format ---
  if (typeof data.email === 'string' && data.email.trim() !== '') {
    if (!EMAIL_REGEX.test(data.email)) {
      errors.push('"email" must be a valid email address.');
    }
  }

  // --- Optional qualification questions (enum) ---
  const enumChecks: Array<{ key: string; allowed: readonly string[] }> = [
    { key: 'q1', allowed: Q1_VALUES },
    { key: 'q2', allowed: Q2_VALUES },
    { key: 'q3', allowed: Q3_VALUES },
  ];

  for (const { key, allowed } of enumChecks) {
    const val = data[key];
    if (val === undefined || val === null || val === '') continue; // optional
    if (typeof val !== 'string') {
      errors.push(`"${key}" must be a string.`);
      continue;
    }
    if (!allowed.includes(val as string)) {
      errors.push(`"${key}" must be one of: ${allowed.join(', ')}.`);
    }
  }

  return errors;
}
