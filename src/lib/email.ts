import { Resend } from "resend";

const FROM = "Clicks <noreply@clickspr.com>";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendOtpEmail(to: string, otp: string) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Your Clicks verification code",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#080c12;color:#fff;border-radius:16px;padding:32px;border:1px solid #222">
        <img src="https://clickspr.com/logo.png" alt="Clicks" style="height:40px;margin-bottom:24px" />
        <h2 style="margin:0 0 8px;font-size:22px;color:#08daf4">Verify your email</h2>
        <p style="color:#aaa;margin:0 0 28px">Enter this 6-digit code to complete your registration. It expires in 10 minutes.</p>
        <div style="letter-spacing:10px;font-size:42px;font-weight:900;color:#08daf4;text-align:center;background:#0d1117;border-radius:12px;padding:20px 0;margin-bottom:28px">${otp}</div>
        <p style="color:#666;font-size:12px;margin:0">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Reset your Clicks password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#080c12;color:#fff;border-radius:16px;padding:32px;border:1px solid #222">
        <img src="https://clickspr.com/logo.png" alt="Clicks" style="height:40px;margin-bottom:24px" />
        <h2 style="margin:0 0 8px;font-size:22px;color:#08daf4">Reset your password</h2>
        <p style="color:#aaa;margin:0 0 28px">We received a request to reset your password. Click the button below — this link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display:block;text-align:center;background:#08daf4;color:#000;font-weight:900;font-size:15px;padding:14px 0;border-radius:12px;text-decoration:none;margin-bottom:24px">Reset Password</a>
        <p style="color:#666;font-size:12px;margin:0">If you didn't request a password reset, you can safely ignore this email. Your password won't change.</p>
      </div>
    `,
  });
}

