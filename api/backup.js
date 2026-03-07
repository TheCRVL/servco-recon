// ─── /api/backup.js ───────────────────────────────────────────────────────────
// GET  → { lastBackup: ISO | null }   (timestamp of most-recent backup record)
// POST → { success, synced, deleted, timestamp }  (run full backup job)
//
// Auth: Authorization: Bearer <VITE_NOTION_TOKEN>  –OR–  CRON_SECRET (Vercel cron)
// Logging: Vercel console.log / console.error only — no Notion writes for logs
// ──────────────────────────────────────────────────────────────────────────────

const BACKUP_DB_ID = "31c688da23fd80ec98e8f474f9649b61";
const NOTION_VER   = "2022-06-28";

// ── Notion fetch helper (server-side, no CORS proxy needed) ──────────────────
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
    hasMore = data.has_more  || false;
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

// ── Build backup-DB properties from a live Notion page ───────────────────────
// Mirrors carToNotion field-by-field, then appends "Source Record ID".
// Notes may span multiple rich_text segments — we re-join and re-chunk at 2000 chars.
function buildBackupProps(page) {
  const p   = page.properties;
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
    // Pointer back to the live record — used for sync matching
    "Source Record ID":  rt(page.id),
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Auth guard — accepts admin token OR Vercel cron secret
  const NOTION_TOKEN = process.env.VITE_NOTION_TOKEN;
  const LIVE_DB_ID   = process.env.VITE_NOTION_DB_ID;
  const CRON_SECRET  = process.env.CRON_SECRET;
  const auth = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  const isAdmin = !!NOTION_TOKEN && auth === NOTION_TOKEN;
  const isCron  = !!CRON_SECRET  && auth === CRON_SECRET;
  if (!isAdmin && !isCron) return res.status(401).json({ error: "Unauthorized" });

  const triggeredBy = isCron ? "cron" : "admin";

  // ── GET: return most-recent backup timestamp ─────────────────────────────
  if (req.method === "GET") {
    try {
      const data = await nFetch(
        `databases/${BACKUP_DB_ID}/query`,
        "POST",
        { page_size: 1, sorts: [{ timestamp: "last_edited_time", direction: "descending" }] },
        NOTION_TOKEN
      );
      const latest = data.results?.[0];
      return res.status(200).json({ lastBackup: latest?.last_edited_time || null });
    } catch (err) {
      console.error("[Backup] GET failed:", err.message);
      return res.status(500).json({ error: err.message, lastBackup: null });
    }
  }

  // ── POST: run full backup sync job ───────────────────────────────────────
  if (req.method === "POST") {
    const startTime = new Date().toISOString();
    console.log(`[Backup] Job started — ${startTime} — triggeredBy: ${triggeredBy}`);

    try {
      // 1. Fetch all records from both databases
      const [livePages, backupPages] = await Promise.all([
        paginate(LIVE_DB_ID,   NOTION_TOKEN),
        paginate(BACKUP_DB_ID, NOTION_TOKEN),
      ]);

      // 2. Build lookup: liveId → backupPageId
      const backupMap = {};
      for (const bp of backupPages) {
        const srcId = (bp.properties["Source Record ID"]?.rich_text || [])
          .map(r => r.plain_text).join("").trim();
        if (srcId) backupMap[srcId] = bp.id;
      }

      // 3. Sync every live record into backup DB
      let synced = 0;
      await batchLimit(livePages, async (page) => {
        const props = buildBackupProps(page);
        const existingId = backupMap[page.id];
        if (existingId) {
          await nFetch(`pages/${existingId}`, "PATCH", { properties: props }, NOTION_TOKEN);
        } else {
          await nFetch("pages", "POST", { parent: { database_id: BACKUP_DB_ID }, properties: props }, NOTION_TOKEN);
        }
        synced++;
      });

      // 4. Archive backup records whose live counterpart no longer exists
      const liveIdSet = new Set(livePages.map(p => p.id));
      const orphans   = backupPages.filter(bp => {
        const srcId = (bp.properties["Source Record ID"]?.rich_text || [])
          .map(r => r.plain_text).join("").trim();
        return srcId && !liveIdSet.has(srcId);
      });
      await batchLimit(orphans, async (bp) => {
        await nFetch(`pages/${bp.id}`, "PATCH", { archived: true }, NOTION_TOKEN);
      });

      const endTime = new Date().toISOString();
      console.log(
        `[Backup] Job completed — ${endTime} — synced: ${synced}, archived orphans: ${orphans.length}`
      );

      return res.status(200).json({
        success:   true,
        synced,
        deleted:   orphans.length,
        timestamp: endTime,
      });

    } catch (err) {
      console.error(`[Backup] Job failed — ${new Date().toISOString()} — error: ${err.message}`, err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
