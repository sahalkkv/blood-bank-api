const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// ✅ Connect to SQLite
const db = new sqlite3.Database("./blood_bank.db", (err) => {
  if (err) {
    console.error("❌ Error connecting to database:", err.message);
  } else {
    console.log("✅ Connected to SQLite database.");

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
        map_link TEXT,
        image TEXT
      )`,
      (err) => {
        if (err) {
          console.error("❌ Error creating hospitals table:", err.message);
        } else {
          console.log("✅ hospitals table created");
        }
      }
    );

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

    db.run(
      `CREATE TABLE IF NOT EXISTS blood_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hospital_id INTEGER,
        blood_type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        request_date TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
      )`,
      (err) => {
        if (err) {
          console.error("❌ Error creating blood_requests table:", err.message);
        } else {
          console.log("✅ blood_requests table created");
        }
      }
    );
  }
});

// ✅ API to register a new hospital
app.post("/register-hospital", upload.single("image"), (req, res) => {
  const { name, address, city, state, country, latitude, longitude, map_link } =
    req.body;
  const bloodTypes = req.body.bloodTypes || "[]";
  const image = req.file ? req.file.path : null;

  if (!name || !address || !city || !state || !country) {
    return res.status(400).json({
      success: false,
      message: "All required fields must be provided.",
    });
  }

  const query = `INSERT INTO hospitals (name, address, city, state, country, latitude, longitude, map_link, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
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
      image,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ success: false, message: err.message });
      }

      const hospital_id = this.lastID;

      try {
        const parsedBloodTypes = JSON.parse(bloodTypes);
        if (Array.isArray(parsedBloodTypes)) {
          const insertBloodType = `INSERT INTO blood_types (hospital_id, type, quantity) VALUES (?, ?, ?)`;
          parsedBloodTypes.forEach(({ type, quantity }) => {
            if (type && quantity != null) {
              db.run(insertBloodType, [hospital_id, type, quantity], (err) => {
                if (err) {
                  console.error("❌ Error inserting blood type:", err.message);
                }
              });
            }
          });
        }
      } catch (e) {
        console.error("❌ Invalid bloodTypes JSON:", e.message);
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
    SELECT bt.type, bt.quantity, h.name AS hospital_name, h.city, h.state, h.country, h.image
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

// ✅ API to get hospitals by blood type
app.get("/hospital-by-blood", (req, res) => {
  const { type } = req.query;

  if (!type) {
    return res
      .status(400)
      .json({ success: false, message: "Blood type is required." });
  }

  const query = `
    SELECT h.*
    FROM blood_types bt
    JOIN hospitals h ON bt.hospital_id = h.id
    WHERE bt.type = ?
    ORDER BY bt.quantity DESC
    LIMIT 1
  `;

  db.get(query, [type], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }

    if (!row) {
      return res
        .status(404)
        .json({
          success: false,
          message: "No hospital found for this blood type.",
        });
    }

    res.json({
      success: true,
      data: row,
    });
  });
});


// ✅ API to request blood from a specific hospital
app.post("/request-blood", (req, res) => {
  const { hospital_id, blood_type, quantity } = req.body;

  if (!hospital_id || !blood_type || !quantity) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields." });
  }

  const insertRequest = `INSERT INTO blood_requests (hospital_id, blood_type, quantity) VALUES (?, ?, ?)`;
  db.run(insertRequest, [hospital_id, blood_type, quantity], function (err) {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }

    return res.json({
      success: true,
      message: "Blood request submitted successfully.",
      request_id: this.lastID,
    });
  });
});

// ✅ Start server
app.listen(PORT, HOST, () => {
  console.log(`✅ Server running at http://${HOST}:${PORT}`);
});
