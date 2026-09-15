/** All inputs must be loaded server-side. No account flag alone proves MFA for a session. */
export function hasOwnerAuthorization(input: {
  hasSession: boolean;
  emailVerified: boolean;
  isOwner: boolean;
  twoFactorEnabled: boolean;
  sessionMfaVerified: boolean;
}): boolean {
  return input.hasSession && input.emailVerified && input.isOwner
    && input.twoFactorEnabled && input.sessionMfaVerified;
}
