// Email templates for sikhiuni.com. Resend is reserved for
// forgot-password requests only (2026-09-03 cost directive) -- magic-link
// sign-in (functions/api/auth/request.js) is the one pre-existing
// exception, kept alive only for the real users who signed up before
// password auth existed and haven't set one yet.
//
// Design by Fable (claude-fable-5), 2026-09-03, briefed on this site's real
// brand tokens (web/tailwind.config.mjs: navy #0b2444/#0b1e3a, brand navy
// #16335c, saffron/gold #f4b21a/#ffc83d, Source Serif 4 display -> Georgia
// email-safe fallback). {{RESET_LINK}} substituted at send time.

export function resetPasswordTemplate(link) {
  const html = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<title>Reset your Sikhi University password</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f3ee;" bgcolor="#f4f3ee">

  <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;font-size:1px;line-height:1px;mso-hide:all;">Use the secure link inside to reset your Sikhi University password &mdash; it expires in 1 hour.</span>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f3ee" style="background-color:#f4f3ee;">
    <tr>
      <td align="center" style="padding:36px 16px 48px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:560px;">

          <tr>
            <td bgcolor="#f4b21a" style="background-color:#f4b21a; height:6px; line-height:6px; font-size:0; border-radius:8px 8px 0 0;">&nbsp;</td>
          </tr>

          <tr>
            <td bgcolor="#0b2444" align="center" style="background-color:#0b2444; padding:30px 28px 26px 28px;">
              <div style="font-family:Georgia,'Times New Roman',serif; font-size:34px; line-height:40px; color:#ffc83d;">&#9772;</div>
              <div style="font-family:Georgia,'Times New Roman',serif; font-size:21px; line-height:28px; letter-spacing:4px; color:#ffffff; text-transform:uppercase; padding-top:10px;">Sikhi University</div>
              <div style="font-family:Helvetica,Arial,sans-serif; font-size:11px; line-height:16px; letter-spacing:2px; color:#8fa3c0; text-transform:uppercase; padding-top:6px;">sikhiuni.com</div>
            </td>
          </tr>

          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff; border-left:1px solid #e4e1d6; border-right:1px solid #e4e1d6; padding:40px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:Georgia,'Times New Roman',serif; font-weight:normal; font-size:25px; line-height:33px; color:#0b1e3a; padding-bottom:14px;">Reset your password</td>
                </tr>
                <tr>
                  <td style="padding-bottom:22px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="44" bgcolor="#f4b21a" style="background-color:#f4b21a; height:3px; line-height:3px; font-size:0;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; line-height:24px; color:#333a45; padding-bottom:10px;">Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh.</td>
                </tr>
                <tr>
                  <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; line-height:24px; color:#333a45; padding-bottom:28px;">A request was received to reset the password for your Sikhi University account. To choose a new password, use the secure button below.</td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#f4b21a" style="background-color:#f4b21a; border-radius:4px; mso-padding-alt:14px 44px;">
                          <a href="${link}" target="_blank" style="display:inline-block; padding:14px 44px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:20px; font-weight:bold; color:#0b1e3a; text-decoration:none; border-radius:4px;">Reset password</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; line-height:20px; color:#6b7280; padding-bottom:6px;">If the button doesn&rsquo;t open, copy and paste this link into your browser:</td>
                </tr>
                <tr>
                  <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; line-height:20px; padding-bottom:28px; word-break:break-all;">
                    <a href="${link}" target="_blank" style="color:#16335c; text-decoration:underline; word-break:break-all;">${link}</a>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#f7f5ef" style="background-color:#f7f5ef; border-left:3px solid #f4b21a; border-radius:0 4px 4px 0; padding:16px 20px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; line-height:21px; color:#454b56;">
                    <strong style="color:#0b1e3a;">For your security:</strong> this link expires in <strong style="color:#0b1e3a;">1 hour</strong> and may be used <strong style="color:#0b1e3a;">only once</strong>. If you did not request a password reset, no action is required &mdash; your current password remains unchanged.
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Georgia,'Times New Roman',serif; font-size:15px; line-height:24px; color:#333a45; padding-top:28px;">
                    Respectfully,<br>
                    <span style="color:#16335c;">Office of the Registrar &mdash; Sikhi University</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td bgcolor="#0b1e3a" align="center" style="background-color:#0b1e3a; border-radius:0 0 8px 8px; padding:22px 28px;">
              <div style="font-family:Georgia,'Times New Roman',serif; font-size:14px; line-height:20px; letter-spacing:2px; color:#ffc83d; text-transform:uppercase;">Sikhi University</div>
              <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; line-height:19px; color:#8fa3c0; padding-top:6px;">sikhiuni.com</div>
              <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; line-height:17px; color:#5f7396; padding-top:10px;">This message was sent because a password reset was requested for your Sikhi University account. This is a transactional message about your account.</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

  const text = `SIKHI UNIVERSITY — Reset your password

Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh.

A request was received to reset the password for your Sikhi University account.

To choose a new password, open this secure link:

${link}

For your security:
- This link expires in 1 hour.
- It may be used only once.
- If you did not request a password reset, no action is required — your current password remains unchanged.

Respectfully,
Office of the Registrar
Sikhi University

Sikhi University · sikhiuni.com
This message was sent because a password reset was requested for your Sikhi University account.`;

  return { subject: "Reset your Sikhi University password", html, text };
}
