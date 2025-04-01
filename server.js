const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const db = new Database("./blood_bank.db");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

app.use(express.json());
app.use(cors());

// ✅ Create Tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS hospitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    map_link TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS blood_bank (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blood_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    hospital_id INTEGER,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
  );
`);

console.log("✅ Database tables are ready.");

// ✅ API to Register a New Hospital
app.post("/add-hospital", (req, res) => {
  const { name, location, map_link } = req.body;
  if (!name || !location || !map_link) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required." });
  }

  const query = db.prepare(
    `INSERT INTO hospitals (name, location, map_link) VALUES (?, ?, ?)`
  );
  try {
    const result = query.run(name, location, map_link);
    res.json({
      success: true,
      message: "Hospital added successfully.",
      id: result.lastInsertRowid,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ API to Add Blood Stock for a Hospital
app.post("/add-blood", (req, res) => {
  const { blood_type, quantity, hospital_id } = req.body;

  if (!blood_type || !quantity || !hospital_id) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required." });
  }

  const query = db.prepare(
    `INSERT INTO blood_bank (blood_type, quantity, hospital_id) VALUES (?, ?, ?)`
  );
  try {
    const result = query.run(blood_type, quantity, hospital_id);
    res.json({
      success: true,
      message: "Blood added successfully.",
      id: result.lastInsertRowid,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
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
    WHERE b.blood_type = ? AND b.quantity >= ? LIMIT 1
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
