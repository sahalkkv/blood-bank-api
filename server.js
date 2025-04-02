const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

app.use(express.json());
app.use(cors());

// ✅ Connect to SQLite
const db = new sqlite3.Database("./blood_bank.db", (err) => {
  if (err) {
    console.error("❌ Error connecting to database:", err.message);
  } else {
    console.log("✅ Connected to SQLite database.");

    // ✅ Create hospitals table
    db.run(
      `CREATE TABLE IF NOT EXISTS hospitals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        country TEXT NOT NULL,
        latitude TEXT,
        longitude TEXT,
        map_link TEXT
      )`,
      (err) => {
        if (err) {
          console.error("❌ Error creating hospitals table:", err.message);
        } else {
          console.log("✅ hospitals table created");
        }
      }
    );

    // ✅ Create blood types table
    db.run(
      `CREATE TABLE IF NOT EXISTS blood_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hospital_id INTEGER,
        type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
      )`,
      (err) => {
        if (err) {
          console.error("❌ Error creating blood_types table:", err.message);
        } else {
          console.log("✅ blood_types table created");
        }
      }
    );
  }
});

// ✅ API to register a new hospital
app.post("/register-hospital", (req, res) => {
  const {
    name,
    address,
    city,
    state,
    country,
    latitude,
    longitude,
    map_link,
    bloodTypes,
  } = req.body;

  if (!name || !address || !city || !state || !country) {
    return res.status(400).json({
      success: false,
      message: "All required fields must be provided.",
    });
  }

  const query = `INSERT INTO hospitals (name, address, city, state, country, latitude, longitude, map_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.run(
    query,
    [
      name,
      address,
      city,
      state,
      country,
      latitude || null,
      longitude || null,
      map_link || null,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }

      const hospital_id = this.lastID;

      if (bloodTypes && Array.isArray(bloodTypes) && bloodTypes.length > 0) {
        const insertBloodType = `INSERT INTO blood_types (hospital_id, type, quantity) VALUES (?, ?, ?)`;
        bloodTypes.forEach(({ type, quantity }) => {
          db.run(insertBloodType, [hospital_id, type, quantity], (err) => {
            if (err) {
              console.error("❌ Error inserting blood type:", err.message);
            }
          });
        });
      }

      res.json({
        success: true,
        message: "Hospital registered successfully.",
        hospital_id,
      });
    }
  );
});

// ✅ API to get available blood types
app.get("/available-bloods", (req, res) => {
  const query = `
    SELECT bt.type, bt.quantity, h.name AS hospital_name, h.city, h.state, h.country
    FROM blood_types bt
    JOIN hospitals h ON bt.hospital_id = h.id
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }

    res.json({
      success: true,
      data: rows,
    });
  });
});

// ✅ Start server
app.listen(PORT, HOST, () => {
  console.log(`✅ Server running at http://${HOST}:${PORT}`);
});
