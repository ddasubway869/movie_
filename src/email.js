import { Resend } from "resend";

// Lazy-init: don't throw at startup if key is missing
let _resend = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
const FROM = "SLATE <slate@arvl.app>";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

export async function sendVerificationEmail(email, username, token) {
  const link = `${APP_URL}/api/auth/verify?token=${token}`;

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Verify your SLATE account",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="min-height:100vh;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="100%" style="max-width:480px;">
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-size:20px;font-weight:700;letter-spacing:0.15em;color:#ffffff;">SLATE</span>
            </td>
          </tr>
          <tr>
            <td style="background:#141414;border-radius:16px;padding:40px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#ffffff;">
                Verify your email
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#888;line-height:1.6;">
                Hey ${username}, click the button below to verify your email address and start using SLATE.
              </p>
              <a href="${link}"
                style="display:inline-block;background:#ffffff;color:#000000;font-size:14px;font-weight:600;
                       text-decoration:none;padding:12px 28px;border-radius:8px;letter-spacing:0.01em;">
                Verify email
              </a>
              <p style="margin:24px 0 0;font-size:12px;color:#555;line-height:1.6;">
                This link expires in 24 hours. If you didn't create a SLATE account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#444;text-align:center;">
                SLATE &middot; <a href="${APP_URL}" style="color:#444;">slate.arvl.app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });
}
