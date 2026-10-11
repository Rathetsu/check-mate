// Server-side entry. `db` is deliberately not exported (CORE-03).
export { auth } from './auth.ts';
export { DomainError } from './errors.ts';
export { getPreferences, putPreferences } from './services/preferences.ts';
export { getMe, type Me } from './services/account.ts';
export * from './services/analysis-sessions.ts';
export * from './services/tablebase.ts';
export {
  closeStudy,
  publish,
  publishPresence,
  subscribe,
  subscribers,
  type StudyEvent,
  type Subscriber,
} from './pubsub.ts';
export * from './services/studies.ts';
export { requireStudy, studyAccess, type StudyRole } from './services/study-access.ts';
export { defaultStudySettings, type StudySettings } from './schema/studies.ts';
export * from './services/study-members.ts';
