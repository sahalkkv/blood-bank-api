db.serialize(() => {
  // Enable foreign key constraints
  db.run("PRAGMA foreign_keys = ON;");

  // Drop existing tables if they exist
  db.run("DROP TABLE IF EXISTS blood_bank;");
  db.run("DROP TABLE IF EXISTS hospitals;");

  // Create hospitals table
  db.run(`CREATE TABLE IF NOT EXISTS hospitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    map_link TEXT NOT NULL
  )`);

  // Create blood_bank table with hospital_id
  db.run(`CREATE TABLE IF NOT EXISTS blood_bank (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hospital_id INTEGER,
    blood_type TEXT,
    quantity INTEGER,
    FOREIGN KEY(hospital_id) REFERENCES hospitals(id)
  )`);

  // Insert sample data into hospitals
  db.run(`INSERT INTO hospitals (name, location, map_link) VALUES 
    ('AMRITHA HOSPITAL', 'ERNAKULAM', 'https://maps.app.goo.gl/4Ut4V5KENGzu6PFYA')`);

  // Insert sample data into blood_bank
  db.run(`INSERT INTO blood_bank (hospital_id, blood_type, quantity) VALUES 
    (1, 'A+', 10),
    (1, 'A-', 8),
    (1, 'B+', 12),
    (1, 'B-', 5),
    (1, 'O+', 15),
    (1, 'O-', 6),
    (1, 'AB+', 7),
    (1, 'AB-', 3)`);

  // Close the database connection
  db.close((err) => {
    if (err) {
      console.error("Error closing the database:", err.message);
    } else {
      console.log("Database connection closed");
    }
  });
});
