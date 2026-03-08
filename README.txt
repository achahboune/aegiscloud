Deployment notes
================

This version removes the old FormSubmit/Formspree-style frontend submission and sends the form to /api/contact instead.

Files added:
- api/contact.js        -> Vercel serverless endpoint using Nodemailer + Gmail SMTP
- package.json          -> installs nodemailer
- vercel.json           -> declares the Vercel Node runtime

Required Vercel environment variables:
- GMAIL_USER=your-gmail-address
- GMAIL_APP_PASSWORD=your-16-character-gmail-app-password

Recommended setup:
1. In the Gmail account you want to send from, enable 2-Step Verification.
2. Create an App Password in Google Account security settings.
3. In Vercel project settings, add GMAIL_USER and GMAIL_APP_PASSWORD.
4. Deploy the project root containing index.html + api/contact.js.

Behavior:
- When the form is submitted, the frontend sends JSON to /api/contact.
- The serverless function emails the full lead to achahboune@gmail.com.
- replyTo is set to the lead's email so you can answer directly from Gmail.
