/**
 * Shared application configuration derived from environment variables.
 * Import constants from here instead of referencing process.env directly
 * in individual modules, and never hard-code sensitive values inline.
 */

/** The e-mail address that is allowed to access the admin/leads area. */
const _adminEmail = process.env.GMAIL_USER;
if (!_adminEmail) {
  throw new Error('Missing required env GMAIL_USER: set admin email');
}
export const ADMIN_EMAIL: string = _adminEmail;
