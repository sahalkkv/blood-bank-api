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

    // ✅ Drop existing tables (if needed)
    db.serialize(() => {
      db.run(`DROP TABLE IF EXISTS blood_bank`);
      db.run(`DROP TABLE IF EXISTS hospitals`, (err) => {
        if (err) {
          console.error("❌ Error dropping hospitals table:", err.message);
        } else {
          console.log("✅ Dropped existing tables (if existed)");

          // ✅ Create hospitals table
          db.run(
            `CREATE TABLE IF NOT EXISTS hospitals (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              location TEXT NOT NULL,
              map_link TEXT NOT NULL
            )`,
            (err) => {
              if (err) {
                console.error(
                  "❌ Error creating hospitals table:",
                  err.message
                );
              } else {
                console.log("✅ hospitals table created");

                // ✅ Insert sample hospital data
                db.run(
                  `INSERT OR IGNORE INTO hospitals (id, name, location, map_link) VALUES 
                    (1, 'City Hospital', 'New York, USA', 'https://maps.app.goo.gl/mmw3iWwKJ4jy1wbq5'),
                    (2, 'Sunrise Medical Center', 'Los Angeles, USA', 'https://maps.app.goo.gl/xyz123'),
                    (3, 'Green Valley Hospital', 'San Francisco, USA', 'https://maps.app.goo.gl/abc456')`,
                  (err) => {
                    if (err) {
                      console.error(
                        "❌ Error inserting sample hospital data:",
                        err.message
                      );
                    } else {
                      console.log("✅ Sample hospital data inserted");

                      // ✅ Create blood_bank table with hospital_id
                      db.run(
                        `CREATE TABLE IF NOT EXISTS blood_bank (
                          id INTEGER PRIMARY KEY AUTOINCREMENT,
                          blood_type TEXT NOT NULL,
                          quantity INTEGER NOT NULL,
                          hospital_id INTEGER,
                          FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
                        )`,
                        (err) => {
                          if (err) {
                            console.error(
                              "❌ Error creating blood_bank table:",
                              err.message
                            );
                          } else {
                            console.log("✅ blood_bank table created");

                            // ✅ Insert sample blood bank data
                            // ✅ Insert sample blood bank data (updated to 100 units)
                            db.run(
                              `INSERT OR REPLACE INTO blood_bank (blood_type, quantity, hospital_id) VALUES 
    ('A+', 100, 1), ('A-', 100, 1), ('B+', 100, 2), ('B-', 100, 2), 
    ('O+', 100, 3), ('O-', 100, 3), ('AB+', 100, 1), ('AB-', 100, 2)`,
                              (err) => {
                                if (err) {
                                  console.error(
                                    "❌ Error inserting sample blood data:",
                                    err.message
                                  );
                                } else {
                                  console.log(
                                    "✅ Updated sample blood data to 100 units"
                                  );
                                }
                              }
                            );
                          }
                        }
                      );
                    }
                  }
                );
              }
            }
          );
        }
      });
    });
  }
});

// ✅ Get available blood data (with hospital details)
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

// ✅ Request blood (decrement quantity and return hospital info)
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

// ✅ Get available blood types and quantities
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

// ✅ Health check route (important for Render)
app.get("/health", (req, res) => {
  res.status(200).send("Server is healthy");
});

// ✅ Start server
app.listen(PORT, HOST, () => {
  console.log(`✅ Server running at http://${HOST}:${PORT}`);
});
