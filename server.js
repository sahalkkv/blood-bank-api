const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(
  path.join(__dirname, "blood_bank.db"),
  (err) => {
    if (err) {
      console.error("Error opening database:", err.message);
    } else {
      console.log("Connected to the SQLite database.");
    }
  }
);

const app = express();
const PORT = process.env.PORT || 10000;
const HOST = "0.0.0.0";

// Middleware
app.use(express.json());
app.use(cors());

// Database Initialization
db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON;");
  db.run("DROP TABLE IF EXISTS blood_bank;");
  db.run("DROP TABLE IF EXISTS hospitals;");

  db.run(
    `CREATE TABLE IF NOT EXISTS hospitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      map_link TEXT NOT NULL
    )`,
    (err) => {
      if (err) console.error("Error creating hospitals table:", err);
    }
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS blood_bank (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hospital_id INTEGER,
      blood_type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY(hospital_id) REFERENCES hospitals(id)
    )`,
    (err) => {
      if (err) console.error("Error creating blood_bank table:", err);
    }
  );
});

// Start Server
app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
