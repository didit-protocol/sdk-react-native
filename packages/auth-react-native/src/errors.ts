/** Match failures by code: native rejections do not preserve JS subclasses. */
export class DiditAuthUnavailableError extends Error {
  readonly code = 'ERR_DIDIT_AUTH_UNAVAILABLE';

  constructor() {
    super('DiditAuth is unavailable in this build.');
    this.name = 'DiditAuthUnavailableError';
  }
}
