db.serialize(() => {
  // Create the hospitals table first
  db.run(`CREATE TABLE IF NOT EXISTS hospitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    map_link TEXT NOT NULL
  )`);

  // Modify the blood_bank table to include hospital_id
  db.run(`CREATE TABLE IF NOT EXISTS blood_bank (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hospital_id INTEGER,
    blood_type TEXT,
    quantity INTEGER,
    FOREIGN KEY(hospital_id) REFERENCES hospitals(id)
  )`);

  // Insert sample blood bank data with hospital_id
  db.run(`INSERT INTO blood_bank (hospital_id, blood_type, quantity) VALUES 
    (1, 'A+', 10),
    (1, 'A-', 8),
    (1, 'B+', 12),
    (1, 'B-', 5),
    (1, 'O+', 15),
    (1, 'O-', 6),
    (1, 'AB+', 7),
    (1, 'AB-', 3)
  `);
});
