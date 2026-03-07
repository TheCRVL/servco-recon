// ─── /api/restore.js ──────────────────────────────────────────────────────────
// POST → { success, restored, timestamp }
//
// Reads every record from the backup database and PATCHes the matching live
// record (matched by "Source Record ID" field on the backup record).
// Live records that have no matching backup record are left untouched.
//
// Auth: Authorization: Bearer <VITE_NOTION_TOKEN>  (admin only — no cron access)
// Logging: Vercel console.log / console.error only
// ──────────────────────────────────────────────────────────────────────────────

const BACKUP_DB_ID = "31c688da23fd80ec98e8f474f9649b61";
const NOTION_VER   = "2022-06-28";

// ── Notion fetch helper ───────────────────────────────────────────────────────
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

// ── Paginate all pages from a Notion database ────────────────────────────────
async function paginate(dbId, token) {
  const results = [];
  let hasMore = true;
  let cursor  = undefined;
  while (hasMore) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await nFetch(`databases/${dbId}/query`, "POST", body, token);
    if (data.results) results.push(...data.results);
    hasMore = data.has_more    || false;
    cursor  = data.next_cursor || undefined;
  }
  return results;
}

// ── Concurrency-limited batch runner (3 at a time) ───────────────────────────
async function batchLimit(items, fn, limit = 3) {
  for (let i = 0; i < items.length; i += limit) {
    await Promise.all(items.slice(i, i + limit).map(fn));
  }
}

// ── Build live-DB restore properties from a backup Notion page ───────────────
// Mirrors every field from the backup record back to the live DB.
// "Source Record ID" is intentionally excluded — it's a backup-only field.
function buildRestoreProps(bp) {
  const p   = bp.properties;
  const txt = k => p[k]?.rich_text?.[0]?.plain_text || p[k]?.title?.[0]?.plain_text || "";
  const dt  = k => p[k]?.date?.start ? { date: { start: p[k].date.start } } : { date: null };
  const chk = k => ({ checkbox: !!(p[k]?.checkbox) });
  const sel = k => p[k]?.select?.name ? { select: { name: p[k].select.name } } : { select: null };
  const rt  = v => ({ rich_text: [{ text: { content: String(v || "") } }] });

  // Re-join Notes chunks, then re-split at 2000-char boundary
  const rawNotes = (p["Notes"]?.rich_text || []).map(r => r.plain_text).join("");
  const noteChunks = [];
  for (let i = 0; i < rawNotes.length; i += 2000) {
    noteChunks.push({ text: { content: rawNotes.slice(i, i + 2000) } });
  }

  return {
    "Stock No":          { title: [{ text: { content: txt("Stock No") } }] },
    "VIN":               rt(txt("VIN")),
    "Year":              rt(txt("Year")),
    "Make":              rt(txt("Make")),
    "Model":             rt(txt("Model")),
    "Keys":              sel("Keys"),
    "Miles":             rt(txt("Miles")),
    "R/W":               sel("R/W"),
    "Title State":       sel("Title State"),
    "Payoff Bank":       rt(txt("Payoff Bank")),
    "ACV":               rt(txt("ACV")),
    "License Plate":     rt(txt("License Plate")),
    "Color":             rt(txt("Color")),
    "Interior":          rt(txt("Interior")),
    "Stage":             sel("Stage"),
    "Acquired Date":     dt("Acquired Date"),
    "Payoff Sent":       dt("Payoff Sent"),
    "Title RCVD":        dt("Title RCVD"),
    "Sent DMV":          dt("Sent DMV"),
    "SPI Title RCVD":    dt("SPI Title RCVD"),
    "Reg Exp":           dt("Reg Exp"),
    "SC Exp":            dt("SC Exp"),
    "In Svc":            dt("In Svc"),
    "Svc Done":          dt("Svc Done"),
    "Body Shop":         dt("Body Shop"),
    "Detail":            dt("Detail"),
    "Pics":              dt("Pics"),
    "Frontline":         dt("Frontline"),
    "Sold Date":         dt("Sold Date"),
    "Parts Hold":        chk("Parts Hold"),
    "Needs Body Work":   chk("Needs Body Work"),
    "Up For Sale":       chk("Up For Sale"),
    "No Plates":         chk("No Plates"),
    "Title RCVD Toggle": chk("Title RCVD Toggle"),
    "Titled to SPI":     chk("Titled to SPI"),
    "Notes":             { rich_text: noteChunks.length > 0 ? noteChunks : [{ text: { content: "[]" } }] },
    // NOTE: "Source Record ID" intentionally omitted — it is a backup-only field
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Auth guard — admin only (no cron access for restore)
  const NOTION_TOKEN = process.env.VITE_NOTION_TOKEN;
  const auth = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  const isAdmin = !!NOTION_TOKEN && auth === NOTION_TOKEN;
  if (!isAdmin) return res.status(401).json({ error: "Unauthorized" });

  const startTime = new Date().toISOString();
  console.log(`[Restore] Job started — ${startTime}`);

  try {
    // 1. Fetch all backup records
    const backupPages = await paginate(BACKUP_DB_ID, NOTION_TOKEN);

    // 2. For each backup record, PATCH the matching live record
    let restored = 0;
    let skipped  = 0;

    await batchLimit(backupPages, async (bp) => {
      const liveId = (bp.properties["Source Record ID"]?.rich_text || [])
        .map(r => r.plain_text).join("").trim();

      if (!liveId) { skipped++; return; }

      const props = buildRestoreProps(bp);
      const result = await nFetch(`pages/${liveId}`, "PATCH", { properties: props }, NOTION_TOKEN);

      if (result?.object === "error") {
        console.error(`[Restore] Failed to restore liveId=${liveId}: ${result.message}`);
        skipped++;
      } else {
        restored++;
      }
    });

    const endTime = new Date().toISOString();
    console.log(
      `[Restore] Job completed — ${endTime} — restored: ${restored}, skipped: ${skipped}`
    );

    return res.status(200).json({ success: true, restored, timestamp: endTime });

  } catch (err) {
    console.error(`[Restore] Job failed — ${new Date().toISOString()} — error: ${err.message}`, err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
