const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

app.use(express.json());
app.use(cors());

const db = new sqlite3.Database("./blood_bank.db", (err) => {
  if (err) {
    console.error("❌ Error connecting to database:", err.message);
  } else {
    console.log("✅ Connected to SQLite database.");

    db.run(
      `CREATE TABLE IF NOT EXISTS blood_bank (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        blood_type TEXT NOT NULL,
        quantity INTEGER NOT NULL
      )`,
      (err) => {
        if (err) {
          console.error("❌ Error creating table:", err.message);
        } else {
          console.log("✅ blood_bank table created or already exists");

          // Insert sample data
          db.run(
            `INSERT OR IGNORE INTO blood_bank (blood_type, quantity) VALUES 
            ('A+', 10), ('A-', 8), ('B+', 5), ('B-', 7), 
            ('O+', 12), ('O-', 6), ('AB+', 4), ('AB-', 3)`,
            (err) => {
              if (err) {
                console.error("❌ Error inserting sample data:", err.message);
              } else {
                console.log("✅ Sample data inserted");
              }
            }
          );
        }
      }
    );
  }
});

// Get available blood data
app.get("/blood-data", (req, res) => {
  db.all(`SELECT * FROM blood_bank`, [], (err, rows) => {
    if (err) {
      res.status(500).json({ success: false, message: err.message });
    } else {
      res.json({ success: true, data: rows });
    }
  });
});

// Request blood (decrement quantity)
app.post("/request-blood", (req, res) => {
  const { blood_type, quantity } = req.body;

  if (!blood_type || !quantity) {
    return res.status(400).json({
      success: false,
      message: "Blood type and quantity are required.",
    });
  }

  const sql = `UPDATE blood_bank SET quantity = quantity - ? WHERE blood_type = ? AND quantity >= ?`;
  db.run(sql, [quantity, blood_type, quantity], function (err) {
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

// Health check route (important for Render)
app.get("/health", (req, res) => {
  res.status(200).send("Server is healthy");
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`✅ Server running at http://${HOST}:${PORT}`);
});
