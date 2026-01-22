# 📍 HIMATIF Absensi - Sistem Absensi Berbasis Lokasi

Aplikasi absensi modern dengan verifikasi lokasi GPS dan kode akses 6-digit.

## ✨ Fitur Utama

- 🔐 **Autentikasi User & Admin** - Login aman dengan JWT
- 📍 **Geolokasi Browser** - Deteksi lokasi otomatis menggunakan GPS
- 🎯 **Validasi Radius** - Cek apakah user berada di area kampus
- 🔑 **Kode Absensi** - Generate kode 6-digit dengan masa berlaku
- 🗺️ **Google Maps Integration** - Paste link Google Maps untuk set koordinat
- 📊 **Export Data** - Download laporan dalam format CSV atau PDF
- 🎨 **UI Modern** - Tampilan responsive dan user-friendly

## 🚀 Quick Start

### 1. Instalasi

```bash
# Clone repository
git clone <repository-url>
cd himatif-absensi

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env dan ganti JWT_SECRET dengan value yang aman!

# Initialize database & create admin
npm run init-admin
```

### 2. Menjalankan Aplikasi

```bash
# Development mode
npm start

# Aplikasi akan berjalan di http://localhost:3000
```

### 3. Akses Aplikasi

- **User Interface**: http://localhost:3000/index.html
- **Admin Panel**: http://localhost:3000/admin.html

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

⚠️ **PENTING**: Segera ganti password default setelah login pertama!

## 🐳 Deploy dengan Docker

```bash
# Build dan jalankan dengan Docker Compose
docker-compose up -d

# Stop aplikasi
docker-compose down

# Lihat logs
docker-compose logs -f
```

## 📱 Cara Penggunaan

### Untuk User

1. Buka `index.html`
2. Register akun baru atau login
3. Klik "Absen Sekarang" - browser akan meminta izin lokasi
4. (Opsional) Masukkan kode 6-digit dari admin
5. Sistem akan validasi lokasi dan simpan absensi

### Untuk Admin

1. Buka `admin.html`
2. Login dengan akun admin
3. **Set Lokasi Kampus:**
   - Paste link Google Maps, atau
   - Input koordinat manual (Lat, Lng, Radius)
4. **Generate Kode Absensi:**
   - Tentukan masa berlaku (dalam menit)
   - Klik "Generate Kode Baru"
   - Bagikan kode ke user
5. **Monitor & Export:**
   - Lihat daftar absensi real-time
   - Export data ke CSV atau PDF

## 🗺️ Cara Set Koordinat Kampus

### Metode 1: Google Maps Link

1. Buka Google Maps
2. Cari lokasi kampus
3. Klik "Share" atau copy URL dari address bar
4. Paste link di Admin Panel
5. Klik "Set Lokasi dari Link"

**Contoh link yang didukung:**
- `https://www.google.com/maps/@-6.350000,107.300000,17z`
- `https://www.google.com/maps/place/...!3d-6.350000!4d107.300000`

### Metode 2: Input Manual

1. Dapatkan koordinat dari Google Maps
2. Masukkan Latitude, Longitude, dan Radius (meter)
3. Klik "Simpan Koordinat Manual"

## 📊 Database Schema

### Users Table
```sql
- id: INTEGER PRIMARY KEY
- username: TEXT UNIQUE
- password: TEXT (hashed)
- role: TEXT ('user' atau 'admin')
```

### Attendance Table
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER
- lat: REAL
- lng: REAL
- code_used: TEXT (nullable)
- inside: INTEGER (1=di lokasi, 0=luar lokasi)
- created_at: DATETIME
```

### Codes Table
```sql
- id: INTEGER PRIMARY KEY
- code: TEXT (6-digit)
- expires_at: DATETIME
- created_by: INTEGER
- created_at: DATETIME
```

### Settings Table
```sql
- key: TEXT PRIMARY KEY
- value: TEXT
```

## 🔒 Keamanan

### Best Practices

1. **Ganti JWT_SECRET** - Gunakan string random yang kuat
2. **Ganti Password Admin** - Jangan gunakan default password
3. **Gunakan HTTPS** - Untuk production deployment
4. **Backup Database** - Backup file `data/absensi.db` secara berkala
5. **Rate Limiting** - Tambahkan untuk mencegah abuse
6. **Input Validation** - Sudah implemented di server-side

### Generate Secure JWT Secret

```bash
# Linux/Mac
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🛠️ Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite3
- **Authentication**: JWT + bcrypt
- **PDF Generation**: PDFKit
- **Frontend**: Vanilla JavaScript + Modern CSS

## 📁 Struktur File

```
himatif-absensi/
├── server.js           # Main server file
├── db-init.js         # Database initialization
├── package.json       # Dependencies
├── .env              # Environment variables
├── Dockerfile        # Docker configuration
├── docker-compose.yml # Docker Compose config
├── public/
│   ├── index.html    # User interface
│   └── admin.html    # Admin panel
└── data/
    └── absensi.db    # SQLite database (auto-created)
```

## 🔧 Environment Variables

| Variable | Deskripsi | Default |
|----------|-----------|---------|
| `DB_FILE` | Path ke database SQLite | `./data/absensi.db` |
| `JWT_SECRET` | Secret key untuk JWT | `change_this_secret` |
| `PORT` | Port server | `3000` |
| `CAMPUS_LAT` | Latitude kampus default | `-6.350000` |
| `CAMPUS_LNG` | Longitude kampus default | `107.300000` |
| `CAMPUS_RADIUS_M` | Radius kampus (meter) | `200` |

## 🐛 Troubleshooting

### Database Locked Error
```bash
# Stop aplikasi dan hapus file lock
rm data/absensi.db-journal
npm start
```

### Permission Denied (Docker)
```bash
# Fix permissions
sudo chown -R $USER:$USER ./data
```

### Geolocation Not Working
- Pastikan menggunakan HTTPS (kecuali localhost)
- Browser harus support Geolocation API
- User harus memberikan permission

## 📝 TODO / Future Improvements

- [ ] Add user profile & change password feature
- [ ] Implement rate limiting
- [ ] Add email notifications
- [ ] Dashboard dengan chart/statistik
- [ ] Multi-campus support
- [ ] QR Code check-in
- [ ] Mobile app (React Native)

## 📄 License

MIT License - Silakan digunakan dan dimodifikasi sesuai kebutuhan.

## 👥 Contributors

Dibuat untuk HIMATIF (Himpunan Mahasiswa Teknik Informatika)

## 📞 Support

Jika ada pertanyaan atau issue, silakan buat issue di repository ini.

---

**Made with ❤️ for HIMATIF**
