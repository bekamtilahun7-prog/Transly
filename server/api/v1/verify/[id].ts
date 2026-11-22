// GET /api/v1/verify/:verificationId  (header "Authorization: Bearer <partner key>")
// Demo partner API: one shared key from PARTNER_API_KEY_DEMO. NOT connected to
// any government system. Returns the SHA-256 of the issued PDF and never a
// download link. Wrong or missing key -> 401.

import { createHash, timingSafeEqual } from 'node:crypto';
import type { PartnerVerifyResponse } from '../../../../shared/contract';
import { ApiFailure, Reply, route } from '../../_lib/http';
import { lookup } from '../../_lib/verify';

function keyMatches(given: string, expected: string): boolean {
  // Hashing first gives timingSafeEqual two buffers of equal length.
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export default route('GET', async (req): Promise<PartnerVerifyResponse | Reply> => {
  const expected = process.env.PARTNER_API_KEY_DEMO;
  if (!expected) throw new Error('PARTNER_API_KEY_DEMO is not set');

  const header = req.headers.authorization;
  const given = typeof header === 'string' ? /^Bearer\s+(\S+)$/i.exec(header)?.[1] : undefined;
  if (!given || !keyMatches(given, expected)) {
    throw new ApiFailure('UNAUTHORIZED', 'A valid partner API key is required.');
  }

  const { response, issued } = await lookup(req.query.id);
  if (!issued) return new Reply(404, response);
  return { ...response, sha256: issued.sha256 ?? undefined };
});
