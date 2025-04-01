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
    blood_type TEXT,
    quantity INTEGER,
    FOREIGN KEY(hospital_id) REFERENCES hospitals(id)
  )`,
    (err) => {
      if (err) console.error("Error creating blood_bank table:", err);
    }
  );
});
