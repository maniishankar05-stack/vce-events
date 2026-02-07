const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const cookieSession = require("cookie-session");
const { pool, init } = require("./db");

const app = express();
app.set("trust proxy", 1);

const SESSION_SECRET = process.env.SESSION_SECRET || "vce-session-secret";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "";

if (CORS_ORIGIN) {
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });
}

app.use(express.json());
app.use(
  cookieSession({
    name: "vce_session",
    keys: [SESSION_SECRET],
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 8,
  })
);

app.use(express.static(path.join(__dirname, "..")));

const normalizeDateInput = (value) => {
  if (!value) return value;
  const trimmed = String(value).trim();
  if (trimmed.includes("T")) {
    return trimmed.split("T")[0];
  }
  if (trimmed.includes("-")) return trimmed;
  const parts = trimmed.split("/");
  if (parts.length !== 3) return trimmed;
  const [day, month, year] = parts.map((part) => part.trim());
  if (!day || !month || !year) return trimmed;
  return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const normalizeEventDate = (event) => ({
  ...event,
  date: normalizeDateInput(event.date),
});

const requireAuth = (req, res, next) => {
  if (!req.session.clubId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const result = await pool.query(
    "SELECT id, name, username, password_hash FROM clubs WHERE username = $1",
    [username]
  );
  const club = result.rows[0];

  if (!club || !bcrypt.compareSync(password, club.password_hash)) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  req.session.clubId = club.id;
  res.json({ club: { id: club.id, name: club.name, username: club.username } });
});

app.post("/api/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

app.get("/api/me", async (req, res) => {
  if (!req.session.clubId) return res.json({ club: null });
  const result = await pool.query(
    "SELECT id, name, username FROM clubs WHERE id = $1",
    [req.session.clubId]
  );
  res.json({ club: result.rows[0] || null });
});

app.get("/api/events", async (req, res) => {
  const result = await pool.query(
    `SELECT events.*, clubs.name as club_name
     FROM events
     JOIN clubs ON clubs.id = events.club_id
     ORDER BY date ASC`
  );
  res.json(result.rows.map(normalizeEventDate));
});

app.get("/api/events/mine", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT events.*
     FROM events
     WHERE club_id = $1
     ORDER BY date ASC`,
    [req.session.clubId]
  );
  res.json(result.rows.map(normalizeEventDate));
});

app.post("/api/events", requireAuth, async (req, res) => {
  const { title, date, time, venue, category, registration, description } = req.body || {};
  if (!title || !date || !time || !venue || !category) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const clubResult = await pool.query(
    "SELECT id, name FROM clubs WHERE id = $1",
    [req.session.clubId]
  );
  const club = clubResult.rows[0];

  const insertResult = await pool.query(
    `INSERT INTO events
      (club_id, title, date, time, venue, category, organizer, registration, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      club.id,
      title,
      normalizeDateInput(date),
      time,
      venue,
      category,
      club.name,
      registration || "#",
      description || null,
    ]
  );

  res.status(201).json(insertResult.rows[0]);
});

app.put("/api/events/:id", requireAuth, async (req, res) => {
  const eventResult = await pool.query(
    "SELECT * FROM events WHERE id = $1",
    [req.params.id]
  );
  const event = eventResult.rows[0];

  if (!event) return res.status(404).json({ error: "Not found" });
  if (event.club_id !== req.session.clubId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const update = {
    title: req.body.title || event.title,
    date: normalizeDateInput(req.body.date || event.date),
    time: req.body.time || event.time,
    venue: req.body.venue || event.venue,
    category: req.body.category || event.category,
    registration: req.body.registration || event.registration,
    description:
      req.body.description !== undefined ? req.body.description : event.description,
  };

  const updateResult = await pool.query(
    `UPDATE events
     SET title = $1, date = $2, time = $3, venue = $4, category = $5,
         registration = $6, description = $7, updated_at = NOW()
     WHERE id = $8
     RETURNING *`,
    [
      update.title,
      update.date,
      update.time,
      update.venue,
      update.category,
      update.registration,
      update.description,
      req.params.id,
    ]
  );

  res.json(updateResult.rows[0]);
});

app.delete("/api/events/:id", requireAuth, async (req, res) => {
  const eventResult = await pool.query(
    "SELECT * FROM events WHERE id = $1",
    [req.params.id]
  );
  const event = eventResult.rows[0];

  if (!event) return res.status(404).json({ error: "Not found" });
  if (event.club_id !== req.session.clubId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await pool.query("DELETE FROM events WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

init().catch((error) => {
  console.error("Database init failed", error);
});

module.exports = app;
