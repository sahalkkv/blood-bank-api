const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to SQLite database
const db = new sqlite3.Database("./bloodbank.db", (err) => {
  if (err) {
    console.error("❌ Error opening database:", err.message);
  } else {
    console.log("✅ Connected to SQLite database.");
  }
});

// ✅ Create table (if not exists)
db.run(
  `CREATE TABLE IF NOT EXISTS blood_bank (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blood_type TEXT UNIQUE,
    quantity INTEGER
)`,
  (err) => {
    if (err) {
      console.error("❌ Error creating table:", err.message);
    } else {
      console.log("✅ blood_bank table created or already exists");

      // ✅ Insert sample data if table is empty
      db.all(`SELECT COUNT(*) AS count FROM blood_bank`, [], (err, rows) => {
        if (err) {
          console.error("❌ Error checking table:", err.message);
        } else if (rows[0].count === 0) {
          console.log("✅ Inserting sample data...");
          db.run(
            `INSERT INTO blood_bank (blood_type, quantity) VALUES 
                    ('A+', 10), ('A-', 5), ('B+', 8), ('B-', 4),
                    ('O+', 12), ('O-', 3), ('AB+', 6), ('AB-', 2)`,
            (err) => {
              if (err) {
                console.error("❌ Error inserting sample data:", err.message);
              } else {
                console.log("✅ Sample data inserted");
              }
            }
          );
        }
      });
    }
  }
);

// ✅ Endpoint to list blood data
app.get("/blood-data", (req, res) => {
  const sql = `SELECT * FROM blood_bank`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json({ success: true, data: rows });
  });
});

// ✅ Endpoint to handle form submission and decrease quantity
app.post("/request-blood", (req, res) => {
  const { bloodType, quantity } = req.body;

  if (!bloodType || !quantity) {
    return res.status(400).json({
      success: false,
      message: "Blood type and quantity are required.",
    });
  }

  const sql = `UPDATE blood_bank 
                 SET quantity = quantity - ? 
                 WHERE blood_type = ? AND quantity >= ?`;
  db.run(sql, [quantity, bloodType, quantity], function (err) {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    if (this.changes === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Not enough stock available." });
    }
    res.json({ success: true, message: "Blood request processed." });
  });
});

// ✅ Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
