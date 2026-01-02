export async function onRequestPost({ request, env }) {
  try {
    // --- Sanity checks
    if (!env.TURNSTILE_SECRET_KEY) {
      return json({ ok: false, error: "Server misconfig: TURNSTILE_SECRET_KEY missing" }, 500);
    }
    if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) {
      return json({ ok: false, error: "Server misconfig: TG_BOT_TOKEN / TG_CHAT_ID missing" }, 500);
    }

    const ct = (request.headers.get("content-type") || "").toLowerCase();

    // --- Parse fields (support multipart + urlencoded)
    let get = (k) => "";
    if (ct.includes("multipart/form-data")) {
      const fd = await request.formData();
      get = (k) => String(fd.get(k) || "").trim();
    } else {
      const text = await request.text();
      const params = new URLSearchParams(text);
      get = (k) => String(params.get(k) || "").trim();
    }

    // Turnstile token (standard field name)
    const token = get("cf-turnstile-response") || get("turnstile");
    if (!token) {
      return json({ ok: false, error: "Missing Turnstile token" }, 400);
    }

    // --- Verify Turnstile
    const ip = request.headers.get("CF-Connecting-IP") || "";
    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: ip
      })
    });

    const verify = await verifyRes.json();
    if (!verify.success) {
      return json({ ok: false, error: "Turnstile failed", details: verify }, 403);
    }

    // --- Lead fields
    const work_email = get("work_email");
    const company = get("company");
    const compliance = get("compliance");
    const pain = get("pain");
    const source = get("source");
    const page = get("page");

    const now = new Date().toISOString();
    const msg =
`🛡️ New Aegis lead
🏢 Company: ${company || "-"}
📧 Email: ${work_email || "-"}
✅ Compliance: ${compliance || "-"}
😣 Pain: ${pain || "-"}
🔎 Source: ${source || "-"}
🔗 Page: ${page || "-"}
🕒 ${now}`;

    // --- Send Telegram
    const tgRes = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TG_CHAT_ID,
        text: msg,
        disable_web_page_preview: true
      })
    });

    const tgJson = await tgRes.json();
    if (!tgRes.ok || !tgJson.ok) {
      return json({ ok: false, error: "Telegram failed", details: tgJson }, 502);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: "Server error", details: String(e?.message || e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
