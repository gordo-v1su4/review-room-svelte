import Resend from "@auth/core/providers/resend";

const RESET_CODE_LENGTH = 8;
const RESET_CODE_MAX_AGE_SECONDS = 10 * 60;

function generateNumericCode() {
  const code: string[] = [];
  const randomBytes = new Uint8Array(RESET_CODE_LENGTH * 2);

  while (code.length < RESET_CODE_LENGTH) {
    crypto.getRandomValues(randomBytes);
    for (const value of randomBytes) {
      // Reject the top six byte values so every digit has equal probability.
      if (value >= 250) continue;
      code.push(String(value % 10));
      if (code.length === RESET_CODE_LENGTH) break;
    }
  }

  return code.join("");
}

export const passwordResetEmail = Resend({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  from: process.env.AUTH_RESEND_FROM,
  maxAge: RESET_CODE_MAX_AGE_SECONDS,
  generateVerificationToken: async () => generateNumericCode(),
  async sendVerificationRequest({ identifier, provider, token }) {
    const apiKey = provider.apiKey;
    const from = provider.from;

    if (!apiKey || !from) {
      throw new Error("Password reset email is not configured");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [identifier],
        subject: "Reset your Review Room password",
        text: [
          `Your Review Room password reset code is ${token}.`,
          "",
          "This code expires in 10 minutes. If you did not request it, you can ignore this email.",
        ].join("\n"),
        html: `
          <div style="background:#09090b;color:#e4e4e7;font-family:Arial,sans-serif;padding:32px">
            <div style="margin:0 auto;max-width:480px;border:1px solid #27272a;border-radius:12px;background:#18181b;padding:28px">
              <p style="margin:0 0 8px;color:#a1a1aa;font-size:13px;letter-spacing:.08em;text-transform:uppercase">Review Room</p>
              <h1 style="margin:0 0 18px;color:#fafafa;font-size:22px;font-weight:600">Reset your password</h1>
              <p style="margin:0 0 18px;color:#d4d4d8;line-height:1.6">Enter this code in Review Room:</p>
              <p style="margin:0 0 18px;color:#5eead4;font-family:monospace;font-size:32px;font-weight:700;letter-spacing:.18em">${token}</p>
              <p style="margin:0;color:#a1a1aa;font-size:13px;line-height:1.6">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      throw new Error(`Could not send password reset email (${response.status})`);
    }
  },
});

export function isPasswordResetEnabled() {
  return Boolean(process.env.AUTH_RESEND_KEY && process.env.AUTH_RESEND_FROM);
}
