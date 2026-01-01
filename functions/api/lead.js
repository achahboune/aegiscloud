export async function onRequestPost({ request, env }) {
  const form = await request.formData();

  const lead = {
    work_email: String(form.get("work_email") || "").trim(),
    company: String(form.get("company") || "").trim(),
    compliance: String(form.get("compliance") || "").trim(),
    pain: String(form.get("pain") || "").trim(),
    source: String(form.get("source") || "landing-cloudflare").trim(),
    page: String(form.get("page") || "").trim(),
    ts: new Date().toISOString(),
  };

  if (!lead.work_email || !lead.company || !lead.compliance || !lead.pain) {
    return new Response(JSON.stringify({ ok: false, error: "Missing fields" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Message Telegram
  const msg =
`🛡️ New Aegis lead
🏢 Company: ${lead.company}
📧 Email: ${lead.work_email}
✅ Compliance: ${lead.compliance}
😣 Pain: ${lead.pain}
🔎 Source: ${lead.source}
🔗 Page: ${lead.page}
🕒 ${lead.ts}`;

  const url = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TG_CHAT_ID,
      text: msg
    }),
  });

  if (!resp.ok) {
    const details = await resp.text();
    return new Response(JSON.stringify({ ok: false, error: "Telegram failed", details }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
}
