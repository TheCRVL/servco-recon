// ─── /api/send-report.js ──────────────────────────────────────────────────────
// POST → manual trigger          (Authorization: Bearer <VITE_NOTION_TOKEN>)
// GET  → Vercel cron trigger     (Authorization: Bearer <CRON_SECRET>)
//
// Fetches the live Notion pipeline, builds the Detail + Photos queue email,
// sends it via Gmail SMTP, and records last-sent / status in report settings.
//
// Env vars required:
//   VITE_NOTION_TOKEN       – Notion integration token
//   VITE_NOTION_DB_ID       – Live vehicles database ID
//   CRON_SECRET             – Vercel cron auth secret
//   EMAIL_USER / EMAIL_PASS – Gmail SMTP credentials  (via lib/sendEmail.js)
//   EMAIL_FROM              – Visible sender address
//   VITE_APP_URL            – Public app URL, e.g. https://recon.thecrvl.com
//   REPORT_SETTINGS_PAGE_ID – Notion page used to store report settings
// ─────────────────────────────────────────────────────────────────────────────

import { sendEmail } from "../lib/sendEmail.js";

const NOTION_VER   = "2022-06-28";
const STAGE_LABELS = { fresh: "Fresh", service: "In Service", detail: "Detail", photos: "Photos", frontline: "Frontline ✓" };
const PIPELINE     = ["fresh", "service", "detail", "photos", "frontline"];
// Legacy stage names that may still exist in Notion
const STAGE_MIGRATE = { reg_safety: "fresh", title_work: "fresh", body_shop: "service" };
const DEFAULTS      = { recipients: [], enabled: false, lastSent: null, lastStatus: null, lastError: null };

// ── Notion helpers ────────────────────────────────────────────────────────────
async function nFetch(path, method = "GET", body = null, token) {
  const url = path.startsWith("https://")
    ? path
    : `https://api.notion.com/v1/${path.replace(/^\//, "")}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization:    `Bearer ${token}`,
      "Notion-Version": NOTION_VER,
      "Content-Type":   "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

async function paginateDB(dbId, token) {
  const results = [];
  let hasMore = true, cursor;
  while (hasMore) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await nFetch(`databases/${dbId}/query`, "POST", body, token);
    if (data.results) results.push(...data.results);
    hasMore = data.has_more || false;
    cursor  = data.next_cursor;
  }
  return results;
}

// ── Settings helpers (inline — avoids cross-route import issues) ──────────────
async function readSettings(token) {
  const pageId = process.env.REPORT_SETTINGS_PAGE_ID;
  if (!pageId) return { ...DEFAULTS };
  try {
    const data  = await nFetch(`blocks/${pageId}/children`, "GET", null, token);
    const block = (data.results || []).find(b => b.type === "paragraph");
    if (!block) return { ...DEFAULTS };
    const text  = (block.paragraph?.rich_text || []).map(r => r.plain_text).join("");
    return { ...DEFAULTS, ...JSON.parse(text || "{}") };
  } catch (_) {
    return { ...DEFAULTS };
  }
}

async function patchSettings(patch, token) {
  const pageId = process.env.REPORT_SETTINGS_PAGE_ID;
  if (!pageId) return;
  try {
    const current = await readSettings(token);
    const updated = { ...current, ...patch };
    const text    = JSON.stringify(updated, null, 2);
    const rich    = [{ text: { content: text } }];

    const data  = await nFetch(`blocks/${pageId}/children`, "GET", null, token);
    const block = (data.results || []).find(b => b.type === "paragraph");
    if (block) {
      await nFetch(`blocks/${block.id}`, "PATCH", { paragraph: { rich_text: rich } }, token);
    } else {
      await nFetch(`blocks/${pageId}/children`, "PATCH", {
        children: [{ object: "block", type: "paragraph", paragraph: { rich_text: rich } }],
      }, token);
    }
  } catch (err) {
    console.error("[Report] patchSettings failed:", err.message);
  }
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function fmtDate(iso) {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "Pacific/Honolulu",
    month: "short", day: "numeric", year: "numeric",
  });
}

function nowHST() {
  return new Date().toLocaleString("en-US", {
    timeZone:  "Pacific/Honolulu",
    weekday:   "long", month: "long", day: "numeric", year: "numeric",
    hour:      "numeric", minute: "2-digit", hour12: true,
  }) + " HST";
}

// ── Map a raw Notion page to a minimal vehicle object ─────────────────────────
function mapCar(page) {
  const p   = page.properties;
  const txt = k => (p[k]?.rich_text?.[0]?.plain_text || p[k]?.title?.[0]?.plain_text || "").trim();
  const dt  = k => p[k]?.date?.start || "";
  const rawStage = p["Stage"]?.select?.name || "fresh";
  return {
    stockNo:      txt("Stock No"),
    vin:          txt("VIN"),
    year:         txt("Year"),
    make:         txt("Make"),
    model:        txt("Model"),
    stage:        STAGE_MIGRATE[rawStage] || rawStage,
    acquiredDate: dt("Acquired Date"),
    inSvc:        dt("In Svc"),
    detail:       dt("Detail"),
    pics:         dt("Pics"),
    frontline:    dt("Frontline"),
    soldDate:     dt("Sold Date"),
  };
}

// ── Email builder ─────────────────────────────────────────────────────────────
function buildEmail(cars, appUrl) {
  const detailCars  = cars.filter(c => c.stage === "detail");
  const photosCars  = cars.filter(c => c.stage === "photos");

  // Stage counts (pipeline only — exclude sold)
  const stageCounts = {};
  for (const c of cars) {
    if (c.stage !== "sold") stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1;
  }

  // Aging: acquired ≥ 45 days ago, not sold
  const aging = cars
    .filter(c => c.stage !== "sold" && daysSince(c.acquiredDate) >= 45)
    .sort((a, b) => daysSince(b.acquiredDate) - daysSince(a.acquiredDate));

  const vinLink = vin => (vin && appUrl) ? `${appUrl}?vin=${vin}` : null;
  const today   = nowHST();

  // ── Plain text ──────────────────────────────────────────────────────────────
  const HR  = "─".repeat(44);
  const out = [];

  out.push("Servco Leeward Recon — Daily Report");
  out.push(today);
  out.push("");

  const textSection = (emoji, title, items, stageDate) => {
    out.push(`${emoji} ${title.toUpperCase()} (${items.length} vehicle${items.length !== 1 ? "s" : ""})`);
    out.push(HR);
    if (items.length === 0) {
      out.push("  (none)");
    } else {
      for (const c of items) {
        const daysIn = daysSince(stageDate(c) || c.acquiredDate);
        out.push(`  ${c.year} ${c.make} ${c.model} — Stock #${c.stockNo}`);
        out.push(`  VIN: ${c.vin || "–"}`);
        out.push(`  ${daysIn !== null ? daysIn + " day" + (daysIn !== 1 ? "s" : "") + " in stage" : "–"}`);
        const link = vinLink(c.vin);
        if (link) out.push(`  ${link}`);
        out.push("");
      }
    }
    out.push("");
  };

  textSection("🔧", "Detail Queue",  detailCars, c => c.detail);
  textSection("📸", "Photos Queue",  photosCars, c => c.pics);

  if (aging.length > 0) {
    out.push(`⚠️  AGING ALERTS (≥ 45 days in pipeline)`);
    out.push(HR);
    for (const c of aging) {
      const d    = daysSince(c.acquiredDate);
      const link = vinLink(c.vin);
      out.push(`  ${c.year} ${c.make} ${c.model} — Stock #${c.stockNo} — ${d} days`);
      if (link) out.push(`  ${link}`);
    }
    out.push("");
  }

  out.push("📊 PIPELINE SUMMARY");
  out.push(HR);
  out.push("  " + PIPELINE.map(s => `${STAGE_LABELS[s]}: ${stageCounts[s] || 0}`).join("  |  "));
  out.push(`  Total active: ${PIPELINE.reduce((n, s) => n + (stageCounts[s] || 0), 0)}`);
  out.push("");
  if (appUrl) out.push(`  Open dashboard: ${appUrl}`);

  const text = out.join("\n");

  // ── HTML ────────────────────────────────────────────────────────────────────
  const LINK_STYLE = "color:#2563eb;text-decoration:none;font-size:12px;font-weight:600";
  const CARD_BG    = "background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

  const carCard = (c, stageDate) => {
    const daysIn = daysSince(stageDate(c) || c.acquiredDate);
    const link   = vinLink(c.vin);
    const title  = `${c.year} ${c.make} ${c.model}`;
    return `
      <div style="${CARD_BG}">
        <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:4px">
          ${link
            ? `<a href="${link}" style="color:#1e293b;text-decoration:none" title="Open in Recon Dashboard">${title}</a>`
            : title}
          <span style="font-size:11px;color:#64748b;font-weight:500;margin-left:8px">Stock #${c.stockNo}</span>
        </div>
        <div style="font-size:12px;color:#475569;margin-bottom:4px;font-family:monospace">
          VIN: ${link
            ? `<a href="${link}" style="color:#475569;text-decoration:underline dotted" title="Open in Recon Dashboard">${c.vin || "–"}</a>`
            : (c.vin || "–")}
        </div>
        <div style="font-size:12px;color:#64748b">
          In stage: <strong>${daysIn !== null ? daysIn + " day" + (daysIn !== 1 ? "s" : "") : "–"}</strong>
          &nbsp;·&nbsp; Acquired: ${fmtDate(c.acquiredDate)}
        </div>
        ${link ? `<div style="margin-top:8px"><a href="${link}" style="${LINK_STYLE}">🔗 Open in Recon Dashboard →</a></div>` : ""}
      </div>`;
  };

  const section = (emoji, title, count) => `
    <div style="margin:24px 0 10px;display:flex;align-items:center;gap:8px">
      <span style="font-size:20px">${emoji}</span>
      <span style="font-size:16px;font-weight:800;color:#1e293b">${title}</span>
      <span style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:20px;padding:2px 10px;font-size:12px;color:#64748b;font-weight:600">${count}</span>
    </div>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 10px">`;

  const countLabel = (n, noun) => `${n} ${noun}${n !== 1 ? "s" : ""}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8);padding:24px 28px;color:#fff">
      <div style="font-size:20px;font-weight:800;letter-spacing:.02em">🚗 Servco Leeward Recon</div>
      <div style="font-size:13px;opacity:.8;margin-top:4px">${today}</div>
    </div>

    <div style="padding:24px 28px">

      <!-- Detail Queue -->
      ${section("🔧", "Detail Queue", countLabel(detailCars.length, "vehicle"))}
      ${detailCars.length === 0
        ? `<p style="color:#94a3b8;font-size:13px;font-style:italic;margin:0 0 8px">No vehicles currently in Detail.</p>`
        : detailCars.map(c => carCard(c, c2 => c2.detail)).join("")}

      <!-- Photos Queue -->
      ${section("📸", "Photos Queue", countLabel(photosCars.length, "vehicle"))}
      ${photosCars.length === 0
        ? `<p style="color:#94a3b8;font-size:13px;font-style:italic;margin:0 0 8px">No vehicles currently in Photos.</p>`
        : photosCars.map(c => carCard(c, c2 => c2.pics)).join("")}

      <!-- Aging Alerts -->
      ${aging.length > 0 ? `
      ${section("⚠️", "Aging Alerts", countLabel(aging.length, "vehicle") + " ≥ 45 days")}
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px 16px;margin-bottom:12px">
        ${aging.map(c => {
          const d    = daysSince(c.acquiredDate);
          const link = vinLink(c.vin);
          return `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(254,215,170,.4)">
              <div>
                <span style="font-size:13px;font-weight:700;color:#92400e">${c.year} ${c.make} ${c.model}</span>
                <span style="font-size:11px;color:#b45309;margin-left:8px">Stock #${c.stockNo}</span>
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:12px;font-weight:800;color:#dc2626">${d}d</span>
                ${link ? `<a href="${link}" style="${LINK_STYLE}">View →</a>` : ""}
              </div>
            </div>`;
        }).join("")}
      </div>` : ""}

      <!-- Pipeline Summary -->
      ${section("📊", "Pipeline Summary", "")}
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:24px">
        ${PIPELINE.map(s => `
          <div style="text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 6px">
            <div style="font-size:22px;font-weight:800;color:#1e293b">${stageCounts[s] || 0}</div>
            <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-top:2px">${STAGE_LABELS[s]}</div>
          </div>`).join("")}
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 28px;font-size:11px;color:#94a3b8;text-align:center">
      Sent automatically by Servco Leeward Recon Dashboard
      ${appUrl ? `&nbsp;·&nbsp;<a href="${appUrl}" style="color:#3b82f6;text-decoration:none">Open Dashboard</a>` : ""}
    </div>

  </div>
</body>
</html>`;

  return { text, html };
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  const NOTION_TOKEN = process.env.VITE_NOTION_TOKEN;
  const LIVE_DB_ID   = process.env.VITE_NOTION_DB_ID;
  const CRON_SECRET  = process.env.CRON_SECRET;
  // VITE_APP_URL takes precedence; fall back to Vercel's auto-injected VERCEL_URL
  const APP_URL      = (
    process.env.VITE_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
  ).replace(/\/$/, "");

  const auth    = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  const isAdmin = !!NOTION_TOKEN && auth === NOTION_TOKEN;
  const isCron  = !!CRON_SECRET  && auth === CRON_SECRET;

  if (req.method === "GET"  && !isCron)  return res.status(401).json({ error: "Unauthorized" });
  if (req.method === "POST" && !isAdmin) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET" && req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const startedAt = new Date().toISOString();
  console.log(`[Report] Started — ${startedAt} — trigger: ${isCron ? "cron" : "manual"}`);

  try {
    // 1. Load report settings
    const settings              = await readSettings(NOTION_TOKEN);
    const { recipients, enabled } = settings;

    // Cron respects the enabled flag; manual triggers always run
    if (isCron && !enabled) {
      console.log("[Report] Skipped — reports are disabled in settings");
      return res.status(200).json({ skipped: true, reason: "disabled" });
    }

    if (!recipients || recipients.length === 0)
      return res.status(400).json({ error: "No recipients configured. Add them in Settings → Automated Reports." });

    // 2. Load Notion vehicles
    if (!LIVE_DB_ID) throw new Error("VITE_NOTION_DB_ID not configured");
    const pages = await paginateDB(LIVE_DB_ID, NOTION_TOKEN);
    const cars  = pages.map(mapCar);

    // 3. Build email content
    const { text, html } = buildEmail(cars, APP_URL);
    const dateStr = new Date().toLocaleDateString("en-US", {
      timeZone: "Pacific/Honolulu", month: "short", day: "numeric",
    });
    const subject = `[Automated] Recon Detail + Photos Report — ${dateStr}`;

    // 4. Send
    await sendEmail({ to: recipients, subject, text, html });

    const sentAt = new Date().toISOString();
    console.log(`[Report] Sent to ${recipients.join(", ")} — ${sentAt}`);
    await patchSettings({ lastSent: sentAt, lastStatus: "ok", lastError: null }, NOTION_TOKEN);

    return res.status(200).json({ success: true, recipients, sentAt, vehicleCount: cars.length });

  } catch (err) {
    console.error(`[Report] Failed — ${err.message}`, err);
    await patchSettings({ lastStatus: "error", lastError: err.message }, NOTION_TOKEN).catch(() => {});
    return res.status(500).json({ success: false, error: err.message });
  }
}
