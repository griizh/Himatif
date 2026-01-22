const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const DB_FILE = process.env.DB_FILE || './data/absensi.db';
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const PORT = process.env.PORT || 3000;

const db = new sqlite3.Database(DB_FILE);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function toNum(v, fallback) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function getSetting(key) {
  return new Promise((resolve, reject) => {
    db.get("SELECT value FROM settings WHERE key = ?", [key], (err, row) => {
      if (err) return reject(err);
      resolve(row ? row.value : null);
    });
  });
}

async function getCampus() {
  const LAT = await getSetting('CAMPUS_LAT');
  const LNG = await getSetting('CAMPUS_LNG');
  const R = await getSetting('CAMPUS_RADIUS_M');
  const campusLat = toNum(LAT, toNum(process.env.CAMPUS_LAT, -6.350000));
  const campusLng = toNum(LNG, toNum(process.env.CAMPUS_LNG, 107.300000));
  const campusRadius = toNum(R, toNum(process.env.CAMPUS_RADIUS_M, 200));
  return { campusLat, campusLng, campusRadius };
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  function toRad(v){ return v * Math.PI / 180; }
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2)*Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = payload;
    next();
  });
}

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username & password required' });
  const saltRounds = 10;
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    db.run("INSERT INTO users (username, password, role) VALUES (?,?, 'user')", [username, hash], function(err) {
      if (err) return res.status(400).json({ error: 'Username mungkin sudah ada' });
      res.json({ id: this.lastID, username });
    });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username & password required' });
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!row) return res.status(400).json({ error: 'User not found' });
    bcrypt.compare(password, row.password, (err, ok) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      if (!ok) return res.status(400).json({ error: 'Password salah' });
      const token = jwt.sign({ id: row.id, username: row.username, role: row.role }, JWT_SECRET, { expiresIn: '12h' });
      res.json({ token });
    });
  });
});

app.post('/api/attendance', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { lat, lng, code } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat & lng numeric required' });
  }
  try {
    const { campusLat, campusLng, campusRadius } = await getCampus();
    const distance = haversineDistance(lat, lng, campusLat, campusLng);
    const inside = distance <= campusRadius ? 1 : 0;

    if (code) {
      db.get("SELECT * FROM codes WHERE code = ? AND datetime(expires_at) > datetime('now') ORDER BY id DESC LIMIT 1", [code], (err, row) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        db.run("INSERT INTO attendance (user_id, lat, lng, code_used, inside) VALUES (?,?,?,?,?)", [userId, lat, lng, code, inside], function(err) {
          if (err) return res.status(500).json({ error: 'DB error' });
          const msg = inside ? 'Absensi tercatat (di lokasi).' : 'Absensi tercatat: absensi diluar lokasi universitas buana perjuangan';
          return res.json({ success: true, message: msg + (row ? ' (kode valid)' : ' (kode tidak valid)'), code_valid: !!row, distance_m: Math.round(distance) });
        });
      });
    } else {
      db.run("INSERT INTO attendance (user_id, lat, lng, code_used, inside) VALUES (?,?,?,?,?)", [userId, lat, lng, null, inside], function(err) {
        if (err) return res.status(500).json({ error: 'DB error' });
        const msg = inside ? 'Absensi tercatat (di lokasi).' : 'Absensi tercatat: absensi diluar lokasi universitas buana perjuangan';
        return res.json({ success: true, message: msg, distance_m: Math.round(distance) });
      });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Admin: generate code
app.post('/api/admin/generate-code', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { minutes = 60 } = req.body;
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
  const expiresAt = new Date(Date.now() + minutes * 60000).toISOString();
  db.run("INSERT INTO codes (code, expires_at, created_by) VALUES (?,?,?)", [code, expiresAt, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ code, expires_at: expiresAt });
  });
});

app.get('/api/admin/attendances', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  db.all(`SELECT a.id, a.user_id, u.username, a.lat, a.lng, a.code_used, a.inside, a.created_at
          FROM attendance a LEFT JOIN users u ON a.user_id = u.id
          ORDER BY a.created_at DESC LIMIT 1000`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

app.get('/api/admin/codes', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  db.all("SELECT * FROM codes ORDER BY created_at DESC LIMIT 50", [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

// Get current campus settings
app.get('/api/campus', async (req, res) => {
  try {
    const { campusLat, campusLng, campusRadius } = await getCampus();
    res.json({ lat: campusLat, lng: campusLng, radius_m: campusRadius });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: set campus (lat, lng, radius)
app.post('/api/admin/campus', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { lat, lng, radius_m } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number') return res.status(400).json({ error: 'lat & lng numeric required' });
  const radius = toNum(radius_m, 200);
  db.serialize(() => {
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ['CAMPUS_LAT', String(lat)]);
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ['CAMPUS_LNG', String(lng)]);
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ['CAMPUS_RADIUS_M', String(radius)]);
    res.json({ success: true, lat, lng, radius_m: radius });
  });
});

// Admin: export attendance CSV or PDF
app.get('/api/admin/export', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const format = (req.query.format || 'csv').toLowerCase();
  db.all(`SELECT a.id, a.user_id, u.username, a.lat, a.lng, a.code_used, a.inside, a.created_at
          FROM attendance a LEFT JOIN users u ON a.user_id = u.id
          ORDER BY a.created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (format === 'csv') {
      // build CSV
      const header = ['id','user_id','username','lat','lng','code_used','inside','created_at'];
      const lines = [header.join(',')];
      rows.forEach(r => {
        const esc = v => {
          if (v === null || v === undefined) return '';
          const s = String(v);
          if (s.includes('"') || s.includes(',') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
          return s;
        };
        lines.push([r.id, r.user_id, r.username, r.lat, r.lng, r.code_used, r.inside, r.created_at].map(esc).join(','));
      });
      const csv = lines.join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="attendances.csv"');
      return res.send(csv);
    } else if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="attendances.pdf"');
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      doc.pipe(res);
      doc.fontSize(16).text('Daftar Absensi', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10);
      rows.forEach((r) => {
        const line = `${r.created_at} | ${r.username || r.user_id} | lat:${r.lat},lng:${r.lng} | code:${r.code_used || ''} | inside:${r.inside? 'YA':'TIDAK'}`;
        doc.text(line);
      });
      doc.end();
    } else {
      res.status(400).json({ error: 'format must be csv or pdf' });
    }
  });
});

app.listen(PORT, () => {
  console.log('Server listening on', PORT);
});