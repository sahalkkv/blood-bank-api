db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS blood_bank (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        blood_type TEXT,
        quantity INTEGER
    )`);

  // Insert sample data
  db.run(`INSERT INTO blood_bank (blood_type, quantity) VALUES 
        ('A+', 10),
        ('A-', 8),
        ('B+', 12),
        ('B-', 5),
        ('O+', 15),
        ('O-', 6),
        ('AB+', 7),
        ('AB-', 3)
    `);
});
    