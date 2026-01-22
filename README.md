```markdown
# Himatif Absensi — Final Ready Version

Fitur:
- Login user & admin
- Absen dengan geolokasi browser
- Jika di luar radius kampus, tampilkan: "absensi diluar lokasi universitas buana perjuangan"
- Absen bisa memakai kode (6-digit) yang digenerate admin
- Admin dapat menempelkan link Google Maps (share atau url) lalu klik "Set Campus from Link" — sistem otomatis mengekstrak koordinat dan menyimpannya

Cara pakai cepat:
1. Salin file-file ke repo Anda.
2. Salin `.env.example` menjadi `.env` dan atur `JWT_SECRET`.
3. Jalankan:
   - npm install
   - npm run init-admin
   - npm start
4. Buka:
   - User: http://localhost:3000/index.html
   - Admin: http://localhost:3000/admin.html
5. Di halaman Admin:
   - Login sebagai admin (default: admin / admin123, ubah segera)
   - Tempel link Google Maps (contoh: https://www.google.com/maps/place/... atau https://www.google.com/maps/@-6.350000,107.300000,17z)
   - Klik "Set Campus from Link" — sistem akan menyimpan koordinat dan radius
   - Generate kode 6-digit bila perlu

Catatan keamanan & pengembangan:
- Ganti `JWT_SECRET` dan password admin default setelah instalasi.
- Untuk production gunakan HTTPS, validasi input lebih ketat, dan backup database.
- Jika ingin saya buatkan Dockerfile atau deploy script, beri tahu saya.

```