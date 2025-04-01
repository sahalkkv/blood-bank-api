const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./blood_bank.db");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

// Middleware to parse JSON bodies
app.use(express.json());

// CORS Configuration
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"],
};

// Enable CORS with the configured options
app.use(cors(corsOptions));

// Handle preflight OPTIONS requests
app.options("*", cors(corsOptions));

// Database Initialization
db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON;");

  // Drop existing tables if they exist
  db.run("DROP TABLE IF EXISTS blood_bank;");
  db.run("DROP TABLE IF EXISTS hospitals;");

  // Create hospitals table
  db.run(`CREATE TABLE IF NOT EXISTS hospitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    map_link TEXT NOT NULL
  )`);

  // Create blood_bank table with hospital_id
  db.run(`CREATE TABLE IF NOT EXISTS blood_bank (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hospital_id INTEGER,
    blood_type TEXT,
    quantity INTEGER,
    FOREIGN KEY(hospital_id) REFERENCES hospitals(id)
  )`);

  // Insert sample data
  db.run(`INSERT INTO hospitals (name, location, map_link) VALUES 
    ('AMRITHA HOSPITAL', 'ERNAKULAM', 'https://maps.app.goo.gl/4Ut4V5KENGzu6PFYA')`);

  db.run(`INSERT INTO blood_bank (hospital_id, blood_type, quantity) VALUES 
    (1, 'A+', 10),
    (1, 'A-', 8),
    (1, 'B+', 12),
    (1, 'B-', 5),
    (1, 'O+', 15),
    (1, 'O-', 6),
    (1, 'AB+', 7),
    (1, 'AB-', 3)`);
});

// APIs
app.post("/add-hospital", (req, res) => {
  const { name, location, map_link, bloodData } = req.body;
  if (!name || !location || !map_link || !bloodData || bloodData.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required." });
  }

  // Insert hospital data
  const query = db.prepare(
    `INSERT INTO hospitals (name, location, map_link) VALUES (?, ?, ?)`
  );
  db.run(query, [name, location, map_link], function (err) {
    if (err)
      return res.status(500).json({ success: false, message: err.message });
    const hospital_id = this.lastID;

    // Insert blood data
    const bloodQuery = db.prepare(
      `INSERT INTO blood_bank (blood_type, quantity, hospital_id) VALUES (?, ?, ?)`
    );
    bloodData.forEach((data) => {
      db.run(
        bloodQuery,
        [data.blood_type, data.quantity, hospital_id],
        (err) => {
          if (err)
            return res
              .status(500)
              .json({ success: false, message: err.message });
        }
      );
    });

    res.json({
      success: true,
      message: "Hospital and blood data added successfully.",
      hospital_id: hospital_id,
    });
  });
});

app.get("/blood-data", (req, res) => {
  db.all(
    `SELECT b.blood_type, b.quantity, h.name as hospital_name, h.location, h.map_link
    FROM blood_bank b
    JOIN hospitals h ON b.hospital_id = h.id`,
    [],
    (err, rows) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, data: rows });
    }
  );
});

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
