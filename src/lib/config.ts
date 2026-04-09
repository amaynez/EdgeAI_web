/**
 * Shared application configuration derived from environment variables.
 * Import constants from here instead of referencing process.env directly
 * in individual modules, and never hard-code sensitive values inline.
 */

/** The e-mail address that is allowed to access the admin/leads area. */
export const ADMIN_EMAIL = process.env.GMAIL_USER ?? "";
