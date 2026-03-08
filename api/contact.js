import nodemailer from 'nodemailer';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email, company, compliance, teamsize, message = '' } = req.body || {};

    if (!email || !company || !compliance || !teamsize) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    const recipient = 'achahboune@gmail.com';

    if (!gmailUser || !gmailAppPassword) {
      return res.status(500).json({ success: false, error: 'Email server is not configured' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    const submittedAt = new Date().toISOString();

    await transporter.sendMail({
      from: `AegisCloud Landing <${gmailUser}>`,
      to: recipient,
      replyTo: email,
      subject: `New AegisCloud Security Pack Request — ${company}`,
      text: [
        'New AegisCloud lead',
        '',
        `Work email: ${email}`,
        `Company: ${company}`,
        `Compliance target: ${compliance}`,
        `Engineering team size: ${teamsize}`,
        `Submitted at: ${submittedAt}`,
        '',
        'Blocking issue:',
        message || '(empty)',
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
          <h2>New AegisCloud lead</h2>
          <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;border-color:#ddd">
            <tr><td><strong>Work email</strong></td><td>${escapeHtml(email)}</td></tr>
            <tr><td><strong>Company</strong></td><td>${escapeHtml(company)}</td></tr>
            <tr><td><strong>Compliance target</strong></td><td>${escapeHtml(compliance)}</td></tr>
            <tr><td><strong>Engineering team size</strong></td><td>${escapeHtml(teamsize)}</td></tr>
            <tr><td><strong>Submitted at</strong></td><td>${escapeHtml(submittedAt)}</td></tr>
            <tr><td><strong>Blocking issue</strong></td><td>${escapeHtml(message || '(empty)').replace(/\n/g, '<br/>')}</td></tr>
          </table>
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('contact api error', error);
    return res.status(500).json({ success: false, error: 'Unable to send email' });
  }
}
