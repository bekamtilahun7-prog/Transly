// GET /api/verify/:verificationId  (public, no auth)
// valid / revoked -> 200, not_found -> 404 with { result: 'not_found' }.
// pdfUrl (signed, 5 minutes) is included only for valid, public documents.

import type { VerifyResponse } from '../../../shared/contract';
import { Reply, route } from '../_lib/http';
import { BUCKET, admin } from '../_lib/supabase';
import { lookup } from '../_lib/verify';

const SIGNED_URL_SECONDS = 300;

export default route('GET', async (req): Promise<VerifyResponse | Reply> => {
  const { response, issued } = await lookup(req.query.id);
  if (!issued) return new Reply(404, response);

  const body: VerifyResponse = { ...response };
  if (issued.status === 'issued' && issued.is_public && issued.pdf_path) {
    const signed = await admin().storage.from(BUCKET).createSignedUrl(issued.pdf_path, SIGNED_URL_SECONDS);
    // A failed signature should not hide a valid result; the link is just left out.
    if (signed.error) console.error(`[storage] sign: ${signed.error.message}`);
    else body.pdfUrl = signed.data.signedUrl;
  }
  return body;
});
