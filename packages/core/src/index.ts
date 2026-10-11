// Server-side entry. `db` is deliberately not exported (CORE-03).
export { auth } from './auth.ts';
export { DomainError } from './errors.ts';
export { getPreferences, putPreferences } from './services/preferences.ts';
export { getMe, type Me } from './services/account.ts';
