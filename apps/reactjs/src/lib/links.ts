/** URL a QR code / share link points to: /v/<verificationId> on this site. */
export const verifyUrl = (verificationId: string, origin = window.location.origin) => `${origin}/v/${verificationId}`
