// ─── /api/report-settings.js ──────────────────────────────────────────────────
// GET  → { recipients, enabled, lastSent, lastStatus, lastError }
// POST → (partial patch) body fields are merged into existing settings
//
// Settings are persisted as a JSON blob in the first paragraph block of the
// Notion page identified by REPORT_SETTINGS_PAGE_ID.
//
// Auth: Authorization: Bearer <VITE_NOTION_TOKEN>  (admin only)
//
// Setup: Create a blank Notion page, share it with your integration, then set
//        REPORT_SETTINGS_PAGE_ID to the page ID (from the page URL).
// ─────────────────────────────────────────────────────────────────────────────

const NOTION_VER = "2022-06-28";

const DEFAULTS = {
  recipients:  [],   // array of email strings
  enabled:     false,
  lastSent:    null,
  lastStatus:  null, // "ok" | "error" | null
  lastError:   null,
};

// ── Notion fetch helper ───────────────────────────────────────────────────────
async function nFetch(path, method = "GET", body = null) {
  const token = process.env.VITE_NOTION_TOKEN;
  const url   = path.startsWith("https://")
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

// ── Read settings from Notion page blocks ─────────────────────────────────────
async function readSettings() {
  const pageId = process.env.REPORT_SETTINGS_PAGE_ID;
  if (!pageId) return { ...DEFAULTS };

  try {
    const data  = await nFetch(`blocks/${pageId}/children`);
    const block = (data.results || []).find(b => b.type === "paragraph");
    if (!block) return { ...DEFAULTS };

    const text = (block.paragraph?.rich_text || []).map(r => r.plain_text).join("");
    return { ...DEFAULTS, ...JSON.parse(text || "{}") };
  } catch (_) {
    return { ...DEFAULTS };
  }
}

// ── Write settings to Notion page block ──────────────────────────────────────
async function writeSettings(settings) {
  const pageId = process.env.REPORT_SETTINGS_PAGE_ID;
  if (!pageId) throw new Error("REPORT_SETTINGS_PAGE_ID is not configured");

  const text = JSON.stringify(settings, null, 2);
  const rich  = [{ text: { content: text } }];

  // Find existing paragraph block (if any)
  const data  = await nFetch(`blocks/${pageId}/children`);
  const block = (data.results || []).find(b => b.type === "paragraph");

  if (block) {
    // Update in-place
    await nFetch(`blocks/${block.id}`, "PATCH", {
      paragraph: { rich_text: rich },
    });
  } else {
    // Append a new paragraph block
    await nFetch(`blocks/${pageId}/children`, "PATCH", {
      children: [{
        object: "block",
        type:   "paragraph",
        paragraph: { rich_text: rich },
      }],
    });
  }

  return settings;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Admin-only — requires VITE_NOTION_TOKEN
  const NOTION_TOKEN = process.env.VITE_NOTION_TOKEN;
  const auth         = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!NOTION_TOKEN || auth !== NOTION_TOKEN)
    return res.status(401).json({ error: "Unauthorized" });

  // ── GET: return current settings ─────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const settings = await readSettings();
      return res.status(200).json(settings);
    } catch (err) {
      console.error("[ReportSettings] GET failed:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST: patch settings ──────────────────────────────────────────────────
  if (req.method === "POST") {
    try {
      const current = await readSettings();
      const updated = { ...current, ...req.body };
      await writeSettings(updated);
      return res.status(200).json(updated);
    } catch (err) {
      console.error("[ReportSettings] POST failed:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
