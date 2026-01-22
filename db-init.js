const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_FILE = process.env.DB_FILE || './data/absensi.db';
const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('user','admin')) DEFAULT 'user'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    lat REAL,
    lng REAL,
    code_used TEXT,
    inside INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT,
    expires_at DATETIME,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  console.log('Database and tables ensured.');

  // insert default campus settings from env if not present
  const defaultLat = process.env.CAMPUS_LAT || '-6.350000';
  const defaultLng = process.env.CAMPUS_LNG || '107.300000';
  const defaultRadius = process.env.CAMPUS_RADIUS_M || '200';

  db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", ['CAMPUS_LAT', defaultLat]);
  db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", ['CAMPUS_LNG', defaultLng]);
  db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", ['CAMPUS_RADIUS_M', defaultRadius]);

  // create default admin if none exists
  db.get("SELECT COUNT(*) as c FROM users WHERE role='admin'", (err, row) => {
    if (err) throw err;
    if (row.c === 0) {
      const username = 'admin';
      const password = 'admin123'; // change after first login
      const saltRounds = 10;
      bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) throw err;
        db.run("INSERT INTO users (username, password, role) VALUES (?,?, 'admin')", [username, hash], function(err) {
          if (err) throw err;
          console.log('Default admin created:', username, '/', password);
          console.log('Please change the password after first login.');
          db.close();
        });
      });
    } else {
      console.log('Admin user already exists.');
      db.close();
    }
  });
});