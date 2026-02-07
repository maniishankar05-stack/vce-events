const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { pool, init } = require("./db");

const dataPath = path.join(__dirname, "..", "data", "events.json");

const seedClubs = [
  { name: "CyberSync", username: "cybersync", password: "Cybr!8mQ2#TzL" },
  { name: "Elecsol", username: "elecsol", password: "El3c$9nVpQ7!" },
  { name: "MACHINES", username: "machines", password: "Mach!4Rz8Kp#1" },
  { name: "Civista", username: "civista", password: "Civ!7Qx2Lm$9" },
  {
    name: "Student Developers Club",
    username: "studentdevelopersclub",
    password: "SDC!5tY9#kN2",
  },
  { name: "Gaming", username: "gaming", password: "G@me7Zp3!Qx" },
  {
    name: "Literature and Books",
    username: "literatureandbooks",
    password: "LitB!6mR8#uV",
  },
  { name: "Rosnes", username: "rosnes", password: "Ros!9qT2@wP5" },
  { name: "Eco-Star", username: "ecostar", password: "Eco*4Nq7!sX" },
  {
    name: "Capture Cliq",
    username: "capturecliq",
    password: "CapQ!3mZ9#fL",
  },
  { name: "Sports Club", username: "sportsclub", password: "Sport!8vR2#dM" },
  { name: "Nrutya Club", username: "nrutyaclub", password: "Nru!6kP9@tS" },
  { name: "Raaga Club", username: "raagaclub", password: "Raa!5xQ7#pV" },
  {
    name: "Fine Arts Club",
    username: "fineartsclub",
    password: "Fine!9wL3#tJ",
  },
  { name: "OTAKU CLUB", username: "otakuclub", password: "Otaku!7rN2#vB" },
  { name: "V-Chef", username: "vchef", password: "VChef!6uQ8#zK" },
  {
    name: "ABHINAYA CLUB",
    username: "abhinayaclub",
    password: "Abhi!4tX9#pD",
  },
  { name: "Jouneyzia", username: "jouneyzia", password: "Joun!8sR3#qF" },
  {
    name: "Science and Spirituality",
    username: "scienceandspirituality",
    password: "SciS!5mP7#vT",
  },
  {
    name: "Vardhaman Podcast",
    username: "vardhamanpodcast",
    password: "VPod!7qL2#kZ",
  },
  { name: "Connect Club", username: "connectclub", password: "Conn!9tR4#yM" },
  { name: "Team MUN", username: "teammun", password: "MUN!6pX8#sN" },
];

const run = async () => {
  await init();

  const existing = await pool.query("SELECT COUNT(*) FROM clubs");
  if (Number(existing.rows[0].count) === 0) {
    for (const club of seedClubs) {
      const hash = bcrypt.hashSync(club.password, 10);
      await pool.query(
        "INSERT INTO clubs (name, username, password_hash) VALUES ($1, $2, $3)",
        [club.name, club.username, hash]
      );
    }
  }

  const eventCount = await pool.query("SELECT COUNT(*) FROM events");
  if (Number(eventCount.rows[0].count) === 0 && fs.existsSync(dataPath)) {
    const raw = fs.readFileSync(dataPath, "utf8");
    const events = JSON.parse(raw);

    for (const event of events) {
      const clubResult = await pool.query("SELECT id, name FROM clubs WHERE name = $1", [
        event.organizer,
      ]);
      const club = clubResult.rows[0] ||
        (await pool.query("SELECT id, name FROM clubs ORDER BY id LIMIT 1")).rows[0];

      const organizer = event.organizer || club.name;

      await pool.query(
        `INSERT INTO events
         (club_id, title, date, time, venue, category, organizer, registration, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          club.id,
          event.title,
          event.date,
          event.time,
          event.venue,
          event.category,
          organizer,
          event.registration || "#",
          event.description || null,
        ]
      );
    }
  }

  console.log("Seed complete.");
  await pool.end();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
