# Forum Guru - Setup & Usage Guide

## 🚀 Quick Start

### Prerequisites
1. Firebase project dengan Firestore enabled
2. Firebase Authentication configured
3. User sudah login ke aplikasi

### Setup Steps
1. Pastikan konfigurasi Firebase di `src/config.js` sudah benar
2. Buka `forum.html` di browser
3. Login dengan akun guru yang valid
4. Mulai berdiskusi!

## 📱 Cara Penggunaan

### Membuat Postingan Baru
1. Klik tombol **+** di header forum
2. Pilih kategori yang sesuai
3. Isi judul yang menarik dan deskriptif
4. Tulis isi diskusi dengan detail
5. Gunakan hashtag (#) untuk topik tertentu
6. Klik **Posting** untuk mempublikasikan

### Berinteraksi dengan Postingan
- **Like**: Klik tombol 👍 untuk menyukai postingan
- **Komentar**: Klik tombol 💬 untuk melihat/menambah komentar
- **Edit**: Klik ikon edit (hanya untuk postingan sendiri)
- **Hapus**: Klik ikon hapus (hanya untuk postingan sendiri)

### Mencari Diskusi
- Gunakan kotak pencarian untuk mencari berdasarkan judul/isi
- Klik kategori untuk filter berdasarkan topik
- Kombinasikan pencarian dan filter untuk hasil yang lebih spesifik

## 🎯 Tips Penggunaan

### Membuat Postingan yang Baik
- **Judul Jelas**: Gunakan judul yang menggambarkan isi diskusi
- **Konteks Lengkap**: Berikan informasi yang cukup untuk dipahami
- **Hashtag**: Gunakan #kurikulummerdeka #scamper #asesmen dll
- **Pertanyaan Spesifik**: Ajukan pertanyaan yang konkret

### Berkomentar dengan Efektif
- **Konstruktif**: Berikan masukan yang membangun
- **Relevan**: Pastikan komentar sesuai dengan topik
- **Sopan**: Gunakan bahasa yang profesional dan ramah
- **Berbagi Pengalaman**: Ceritakan pengalaman serupa

### Menggunakan Kategori
- **SCAMPER**: Diskusi tentang metode SCAMPER
- **RPP**: Rencana Pelaksanaan Pembelajaran
- **Asesmen**: Penilaian dan evaluasi
- **Kurikulum**: Kurikulum Merdeka dan implementasinya
- **Pembelajaran**: Strategi dan metode mengajar
- **Teknologi**: Tools dan aplikasi pendidikan
- **Diskusi**: Topik umum lainnya

## 🔧 Troubleshooting

### Masalah Umum

#### Postingan tidak muncul
- Pastikan koneksi internet stabil
- Refresh halaman (F5)
- Cek apakah sudah login
- Periksa filter kategori yang aktif

#### Tidak bisa membuat postingan
- Pastikan sudah login dengan akun yang valid
- Cek semua field sudah diisi
- Pastikan koneksi ke Firebase stabil

#### Like tidak berfungsi
- Pastikan sudah login
- Coba refresh halaman
- Cek koneksi internet

#### Komentar tidak muncul
- Klik tombol 💬 untuk membuka section komentar
- Pastikan sudah login untuk berkomentar
- Refresh halaman jika perlu

### Mode Debug
Tambahkan `?test=true` di URL untuk menjalankan automated testing:
```
http://localhost:3000/pages/forum/forum.html?test=true
```

## 📊 Fitur Lanjutan

### Hashtag System
- Gunakan # diikuti kata kunci tanpa spasi
- Contoh: #kurikulummerdeka #asesmen #scamper
- Hashtag akan otomatis di-highlight
- Membantu kategorisasi dan pencarian

### Real-time Updates
- Postingan baru akan muncul otomatis
- Like dan komentar ter-update real-time
- Tidak perlu refresh manual

### Offline Support
- Data ter-cache di localStorage
- Bisa baca postingan saat offline
- Sync otomatis saat online kembali

## 🛡️ Keamanan & Privasi

### Data yang Disimpan
- Judul dan isi postingan
- Nama dan email author
- Timestamp pembuatan/edit
- Like dan komentar

### Hak Akses
- Hanya bisa edit/hapus postingan sendiri
- Hanya bisa edit/hapus komentar sendiri
- Semua user bisa melihat semua postingan

### Moderasi
- Laporkan konten tidak pantas ke admin
- Gunakan bahasa yang sopan dan profesional
- Hindari spam atau konten off-topic

## 📈 Best Practices

### Untuk Diskusi yang Produktif
1. **Baca dulu** sebelum bertanya hal yang sama
2. **Search** untuk topik yang sudah ada
3. **Be specific** dalam pertanyaan
4. **Follow up** pada diskusi yang Anda mulai
5. **Appreciate** kontribusi orang lain dengan like

### Untuk Komunitas yang Sehat
1. **Respect** pendapat yang berbeda
2. **Help** sesama guru dengan berbagi pengalaman
3. **Stay on topic** sesuai kategori
4. **Professional** dalam berkomunikasi
5. **Constructive** dalam memberikan feedback

## 🆘 Bantuan Lebih Lanjut

Jika mengalami masalah teknis:
1. Cek dokumentasi lengkap di `FORUM_DOCUMENTATION.md`
2. Jalankan test otomatis dengan `?test=true`
3. Hubungi admin sistem
4. Laporkan bug melalui feedback form

---

**Happy Learning & Sharing! 🎓✨**
