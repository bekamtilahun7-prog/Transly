// Password-reset mail through Resend. The template lives in Resend
// (alias password-reset); this file only fills RESET_CODE.

import { Resend } from 'resend';

const TEMPLATE = 'password-reset';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryable(status: number | null | undefined): boolean {
  return status === 429 || (typeof status === 'number' && status >= 500);
}

/** True when Resend accepted the send. False when the key is missing or the send was rejected. */
export async function sendPasswordResetCode(to: string, code: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM || 'Transly <hello@mail.transly.com>';
  const idempotencyKey = `password-reset/${to}/${code}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data, error } = await resend.emails.send(
        {
          from,
          to: [to],
          template: { id: TEMPLATE, variables: { RESET_CODE: code } },
        },
        { idempotencyKey },
      );
      if (!error && data?.id) {
        console.log(`[auth] reset email sent ${data.id}`);
        return true;
      }
      const status = error?.statusCode;
      console.error(`[auth] resend reset: ${error?.message ?? 'no email id'}`);
      if (!retryable(status) || attempt === 2) return false;
      await sleep(Math.min(1000 * 2 ** attempt, 8000) + Math.floor(Math.random() * 250));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'network error';
      console.error(`[auth] resend reset: ${message}`);
      if (attempt === 2) return false;
      await sleep(Math.min(1000 * 2 ** attempt, 8000));
    }
  }
  return false;
}
