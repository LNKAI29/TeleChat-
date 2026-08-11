export function buildOtpEmail(code: string) {
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px">
    <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a">Verify your TeleChat email</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#475569">Use the code below to finish setting up your account. It expires in 10 minutes.</p>
    <div style="font-size:34px;letter-spacing:10px;font-weight:700;color:#0ea5b7;background:#f1f5f9;border-radius:14px;padding:18px;text-align:center">${code}</div>
    <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">If you didn't request this, you can safely ignore this email.</p>
  </div></body></html>`;
}