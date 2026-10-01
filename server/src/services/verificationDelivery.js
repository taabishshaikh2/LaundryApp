export async function deliverVerificationCode({ channel, destination, code }) {
  if (process.env.NODE_ENV !== "production") return { developmentCode: code };
  const url = process.env.VERIFICATION_WEBHOOK_URL;
  if (!url) throw new Error("Verification delivery provider is not configured");
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(process.env.VERIFICATION_WEBHOOK_SECRET ? { authorization: `Bearer ${process.env.VERIFICATION_WEBHOOK_SECRET}` } : {}) },
    body: JSON.stringify({ channel, destination, code, purpose: "CONTACT_VERIFICATION", expiresInMinutes: 10 }),
  });
  if (!response.ok) throw new Error("Verification provider rejected the message");
  return {};
}
