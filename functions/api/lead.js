export async function onRequestPost({ request, env }) {
  try {
    // ---- Safety checks (clear error messages)
    if (!env.TURNSTILE_SECRET_KEY) {
      return json({ ok: false, error: "Server misconfig: TURNSTILE_SECRET_KEY missing" }, 500);
    }
    if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) {
      return json({ ok: false, error: "Server misconfig: TG_BOT_TOKEN or TG_CHAT_ID missing" }, 500);
    }

    const ct = request.headers.get("content-type") || "";
    const data = {};

    // Parse body robustly (FormData => multipart/form-data)
    if (ct.includes("multipart/form-data")) {
      const fd = await request.formData();
      for (const [k, v] of fd.entries()) data[k] = String(v);
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const text = await request.text();
      const p = new URLSearchParams(text);
      for (const [k, v] of p.entries()) data[k] = v;
    } else if (ct.includes("application/json")) {
      const j = await request.json();
      for (const k of Object.keys(j || {})) data[k] = String(j[k]);
    } else {
      const text = await request.text();
      const p = new URLSearchParams(text);
      for (const [k, v] of p.entries()) data[k] = v;
    }

    // Turnstile token can be either:
    // - "cf-turnstile-response" (default hidden input)
    // - "turnstile" (if you send it manually)
    const token = (data["cf-turnstile-response"] || data["turnstile"] || "").trim();
    if (!token) {
      return json({ ok: false, error: "Missing Turnstile token" }, 400);
    }

    // Verify Turnstile
    const ip = request.headers.get("CF-Connecting-IP") || "";
    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        ...(ip ? { remoteip: ip } : {})
      })
    });

    const verify = await verifyRes.json();
    if (!verify.success) {
      return json(
        { ok: false, error: "Turnstile failed", details: verify },
        403
      );
    }

    // Read fields
    const work_email = (data.work_email || "").trim();
    const company = (data.company || "").trim();
    const compliance = (data.compliance || "").trim();
    const pain = (data.pain || "").trim();
    const source = (data.source || "").trim();
    const page = (data.page || "").trim();

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

    // Send Telegram
    const tgRes = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TG_CHAT_ID,
        text: msg
      })
    });

    const tgJson = await tgRes.json();
    if (!tgRes.ok || !tgJson.ok) {
      return json(
        { ok: false, error: "Telegram failed", details: tgJson },
        502
      );
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
