export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { path } = req.query;
  if (!path) return res.status(400).json({ error: "Missing path" });

  const notionUrl = `https://api.notion.com/v1/${Array.isArray(path) ? path.join("/") : path}`;

  try {
    const response = await fetch(notionUrl, {
      method: req.method,
      headers: {
        "Authorization": `Bearer ${process.env.VITE_NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      ...(req.method !== "GET" && req.body ? { body: JSON.stringify(req.body) } : {}),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
