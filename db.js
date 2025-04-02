const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(
  path.join(__dirname, "blood_bank.db"),
  (err) => {
    if (err) {
      console.error("Error connecting to database:", err.message);
    } else {
      console.log("Database connection established.");
    }
  }
);

module.exports = db;
