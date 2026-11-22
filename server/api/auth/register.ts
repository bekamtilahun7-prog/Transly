// POST /api/auth/register  { email, password, name? } -> { ok: true }
// Creates a confirmed Supabase user. No email is sent.
// The password is stored as a hash by Supabase Auth. The profiles trigger
// inserts the matching public.profiles row.

import { ApiFailure, jsonBody, route } from '../_lib/http';
import { admin } from '../_lib/supabase';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default route('POST', async (req) => {
  const body = jsonBody(req);
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!EMAIL.test(email)) throw new ApiFailure('BAD_REQUEST', 'Enter a valid email address.');
  if (password.length < 6) throw new ApiFailure('BAD_REQUEST', 'Password must be at least 6 characters.');
  if (name.length > 80) throw new ApiFailure('BAD_REQUEST', 'Name is too long.');

  const { error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: name ? { full_name: name } : undefined,
  });

  if (error) {
    if (/already|exists|registered/i.test(error.message)) {
      throw new ApiFailure('BAD_REQUEST', 'An account with this email already exists. Log in.');
    }
    console.error(`[auth] create user: ${error.message}`);
    throw new ApiFailure('BAD_GATEWAY', 'Could not create the account. Try again.');
  }

  return { ok: true as const };
});
