# Mersiflab - Platform Pembelajaran Teknologi & Inovasi

## Deskripsi

Mersiflab adalah platform LMS (Learning Management System) yang berfokus pada pembelajaran teknologi dan inovasi. Platform ini menggunakan teknologi AI (Gemini) untuk membantu pengguna mempelajari AI, IoT, VR, Karya Ilmiah, dan STEM dengan pendekatan interaktif dan modern.

## Fitur Utama

### Sistem Autentikasi
- Login/Register: Sistem autentikasi yang aman dengan validasi
- Session Management: Manajemen sesi dengan timeout otomatis
- Role-based Access: Diferensiasi akses untuk admin dan user
- Profile Management: Pengelolaan profil pengguna yang lengkap

### AI Assistant dengan Gemini
- Tech Support Real-time: Chat langsung dengan AI untuk bantuan teknologi
- Context Awareness: AI memahami konteks percakapan sebelumnya
- Fallback System: Sistem cadangan jika API tidak tersedia
- Quick Tech Questions: Saran pertanyaan cepat untuk topik teknologi
- Material-Based Responses: AI menjawab berdasarkan materi teknologi yang tersedia
- STEM Learning Context: Fokus pada pembelajaran STEM dan teknologi

### Tech Forum Komunitas
- Diskusi Teknologi: Platform berbagi pengetahuan antar tech enthusiast
- Kategori Terorganisir: Pengelompokan berdasarkan topik (AI, IoT, VR, STEM)
- Search & Filter: Pencarian dan filter yang mudah digunakan
- Like & Comment: Sistem interaksi sosial untuk komunitas tech

### Learning Materials Center
- Tech Materials: Konten pembelajaran teknologi yang terstruktur
- Progress Tracking: Pelacakan kemajuan belajar teknologi
- Search Functionality: Pencarian materi teknologi yang cepat
- Responsive Design: Tampilan yang optimal di semua device

### AI-Powered Learning
- Upload Tech Materials: Upload PDF materi teknologi untuk dipahami AI
- Input Tech Links: Masukkan link website teknologi untuk diproses AI
- Embedding Otomatis: AI menggunakan Gemini embedding-001 untuk memahami materi
- Contextual Tech Chat: AI menjawab berdasarkan materi teknologi yang diupload
- Semantic Search: Pencarian materi berdasarkan kemiripan makna teknologi

### Admin Dashboard
- System Overview: Statistik pengguna, materi, dan aktivitas sistem
- System Health: Status AI, storage, dan performa sistem
- Quick Actions: Export data, clear data, dan refresh statistik

## Instalasi & Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd MI
```

### 2. Setup Gemini AI API
1. Dapatkan API key dari [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Edit file `config.js`
3. Ganti `YOUR_GEMINI_API_KEY_HERE` dengan API key Anda

```javascript
// config.js
const CONFIG = {
    GEMINI_API_KEY: 'your-actual-api-key-here',
    // ... konfigurasi lainnya
};
```

### 3. Jalankan Aplikasi
- Buka file `index.html` di browser
- Atau gunakan live server:
```bash
npx live-server
```

### 4. Deploy ke Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login ke Firebase
firebase login

# Inisialisasi project (pilih hosting)
firebase init hosting

# Deploy aplikasi
firebase deploy
```

## Cara Kerja AI dengan Materi Teknologi

### 1. Upload & Embedding
- Pengguna dapat upload PDF atau input link materi teknologi
- AI menggunakan **Gemini embedding-001** untuk memahami konten teknologi
- Materi diproses dan disimpan dengan embeddings untuk pencarian cepat

### 2. Tech-Focused Chat
- AI menganalisis pertanyaan teknologi dan mencari materi yang relevan
- Menggunakan **semantic search** berdasarkan kemiripan makna
- AI fokus menjawab pertanyaan seputar AI, IoT, VR, dan STEM

### 3. Model AI
- **Chat**: Gemini 1.5 Flash untuk respons yang cepat dan akurat
- **Embedding**: Gemini embedding-001 untuk pemahaman materi
- **Fallback**: Sistem cadangan jika API tidak tersedia

## Kredensial Demo

### Admin Account
- **Email**: admin@mersiflab.com
- **Password**: admin123
- **Access**: Full admin dashboard, user management, system settings

### User Account
- **Email**: user@mersiflab.com
- **Password**: user123
- **Access**: Basic user features, AI assistant, tech materials upload

## Fitur Responsif

- **Mobile-First Design**: Optimal untuk perangkat mobile
- **Touch-Friendly**: Interface yang mudah digunakan dengan touch
- **Adaptive Layout**: Layout yang menyesuaikan ukuran layar
- **Progressive Web App Ready**: Siap untuk dijadikan PWA

## Lisensi

Proyek ini dilisensikan di bawah MIT License - lihat file [LICENSE](LICENSE) untuk detail.

## Kontak

- **Email**: support@mersiflab.com
- **Website**: https://mersiflab.com
- **Documentation**: https://docs.mersiflab.com

## Ucapan Terima Kasih

- **Google Gemini AI** untuk teknologi AI yang powerful
- **Tailwind CSS** untuk framework CSS yang luar biasa
- **Inter Font** untuk tipografi yang indah
- **Heroicons** untuk icon yang konsisten

---

**Mersiflab** - Platform pembelajaran teknologi masa depan yang mengintegrasikan AI, IoT, VR, dan STEM untuk menciptakan generasi inovator. 🚀 