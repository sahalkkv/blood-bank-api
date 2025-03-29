const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Connect to SQLite
const db = new sqlite3.Database("./blood_bank.db", (err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Connected to SQLite database.");
  }
});

// Create table if not exists
db.serialize(() => {
  db.run(
    `
        CREATE TABLE IF NOT EXISTS blood_bank (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            blood_type TEXT NOT NULL,
            quantity INTEGER NOT NULL
        )
    `,
    (err) => {
      if (err) {
        console.error("❌ Error creating table:", err.message);
      } else {
        console.log("✅ blood_bank table created or already exists");
      }
    }
  );

  // Insert sample data (optional)
  db.run(
    `
        INSERT INTO blood_bank (blood_type, quantity) 
        VALUES 
        ('A+', 10), 
        ('A-', 5), 
        ('B+', 8), 
        ('B-', 6), 
        ('O+', 12), 
        ('O-', 4), 
        ('AB+', 7), 
        ('AB-', 3)
    `,
    (err) => {
      if (err) {
        console.log("⚠️ Sample data already exists.");
      } else {
        console.log("✅ Sample data inserted.");
      }
    }
  );
});

// API to list blood stock
app.get("/blood-data", (req, res) => {
  db.all(`SELECT * FROM blood_bank`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json({ success: true, data: rows });
  });
});

// API to request blood and reduce quantity
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
