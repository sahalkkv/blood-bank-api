const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const db = new Database("./blood_bank.db");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

app.use(express.json());
app.use(cors());

// ✅ Connect to SQLite
db = new sqlite3.Database("./blood_bank.db", (err) => {
  if (err) {
    console.error("❌ Error connecting to database:", err.message);
  } else {
    console.log("✅ Connected to SQLite database.");

    // ✅ Create Tables
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS hospitals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          location TEXT NOT NULL,
          map_link TEXT NOT NULL
        )`);

      db.run(`CREATE TABLE IF NOT EXISTS blood_bank (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          blood_type TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          hospital_id INTEGER,
          FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
        )`);

      console.log("✅ Database tables are ready.");
    });
  }
});

// ✅ API to Register a New Hospital
app.post("/add-hospital", (req, res) => {
  const { name, location, map_link } = req.body;
  if (!name || !location || !map_link) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required." });
  }

  const query = `INSERT INTO hospitals (name, location, map_link) VALUES (?, ?, ?)`;
  db.run(query, [name, location, map_link], function (err) {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json({
      success: true,
      message: "Hospital added successfully.",
      id: this.lastID,
    });
  });
});

// ✅ API to Add Blood Stock for a Hospital
app.post("/add-blood", (req, res) => {
  const { blood_type, quantity, hospital_id } = req.body;

  if (!blood_type || !quantity || !hospital_id) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required." });
  }

  const query = `INSERT INTO blood_bank (blood_type, quantity, hospital_id) VALUES (?, ?, ?)`;
  db.run(query, [blood_type, quantity, hospital_id], function (err) {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json({
      success: true,
      message: "Blood added successfully.",
      id: this.lastID,
    });
  });
});

// ✅ Get Available Blood Data (With Hospital Details)
app.get("/blood-data", (req, res) => {
  db.all(
    `SELECT b.blood_type, b.quantity, h.name as hospital_name, h.location, h.map_link 
     FROM blood_bank b
     JOIN hospitals h ON b.hospital_id = h.id`,
    [],
    (err, rows) => {
      if (err) {
        res.status(500).json({ success: false, message: err.message });
      } else {
        res.json({ success: true, data: rows });
      }
    }
  );
});

// ✅ Request Blood (Decrease Quantity and Return Hospital Info)
app.post("/request-blood", (req, res) => {
  const { blood_type, quantity } = req.body;

  if (!blood_type || !quantity) {
    return res.status(400).json({
      success: false,
      message: "Blood type and quantity are required.",
    });
  }

  // Find hospital where blood is available
  const query = `
    SELECT b.quantity, h.name as hospital_name, h.location, h.map_link 
    FROM blood_bank b
    JOIN hospitals h ON b.hospital_id = h.id
    WHERE b.blood_type = ? AND b.quantity >= ?
    LIMIT 1
  `;

  db.get(query, [blood_type, quantity], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }

    if (!row) {
      return res
        .status(400)
        .json({ success: false, message: "Not enough stock available." });
    }

    // ✅ Reduce quantity after confirming availability
    const updateQuery = `UPDATE blood_bank SET quantity = quantity - ? WHERE blood_type = ?`;
    db.run(updateQuery, [quantity, blood_type], function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }

      // ✅ Return hospital details
      res.json({
        success: true,
        message: "Blood request processed.",
        hospital: {
          name: row.hospital_name,
          location: row.location,
          map_link: row.map_link,
        },
      });
    });
  });
});

// ✅ Get Available Blood Types and Quantities
app.get("/available-bloods", (req, res) => {
  db.all(
    `SELECT blood_type, quantity FROM blood_bank WHERE quantity > 0`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }
      res.json({ success: true, data: rows });
    }
  );
});

// ✅ Health Check Route
app.get("/health", (req, res) => {
  res.status(200).send("Server is healthy");
});

// ✅ Start Server
app.listen(PORT, HOST, () => {
  console.log(`✅ Server running at http://${HOST}:${PORT}`);
});
