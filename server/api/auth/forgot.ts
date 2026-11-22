// POST /api/auth/forgot  { email, redirectTo? } -> { ok: true }
// Asks Supabase for a recovery code, then sends it with the Resend
// password-reset template. If Resend cannot send yet, falls back to
// Supabase's own recovery email. Always returns ok when the address
// has no account, so the response does not reveal that.

import { ApiFailure, jsonBody, route } from '../_lib/http';
import { sendPasswordResetCode } from '../_lib/mail';
import { admin } from '../_lib/supabase';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function userMissing(message: string): boolean {
  return /not found/i.test(message);
}

export default route('POST', async (req) => {
  const body = jsonBody(req);
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL.test(email)) throw new ApiFailure('BAD_REQUEST', 'Enter a valid email address.');

  const redirectTo =
    typeof body.redirectTo === 'string' && /^https?:\/\//i.test(body.redirectTo)
      ? body.redirectTo
      : undefined;

  const link = await admin().auth.admin.generateLink({
    type: 'recovery',
    email,
    options: redirectTo ? { redirectTo } : undefined,
  });

  if (link.error) {
    if (userMissing(link.error.message)) return { ok: true as const };
    console.error(`[auth] recovery link: ${link.error.message}`);
  } else {
    const code = link.data.properties?.email_otp;
    if (code) {
      const sent = await sendPasswordResetCode(email, code);
      if (sent) return { ok: true as const };
    } else {
      console.error('[auth] recovery link did not include a code');
    }
  }

  const { error } = await admin().auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
  if (error) {
    if (userMissing(error.message)) return { ok: true as const };
    console.error(`[auth] reset email: ${error.message}`);
    throw new ApiFailure('BAD_GATEWAY', 'Could not send the reset email. Try again in a minute.');
  }
  return { ok: true as const };
});
