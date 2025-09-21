# Dokumentasi Forum Guru - AI Project Planner

## Overview
Forum Guru adalah fitur diskusi interaktif yang memungkinkan guru untuk berbagi pengalaman, bertanya, dan berdiskusi tentang pembelajaran berbasis proyek menggunakan metode SCAMPER dan Kurikulum Merdeka.

## Fitur Utama

### 1. **Posting Diskusi**
- Guru dapat membuat postingan baru dengan judul dan isi yang menarik
- Sistem kategori untuk mengorganisir diskusi (SCAMPER, RPP, Asesmen, dll.)
- Support hashtag (#) untuk pengelompokan topik
- Auto-detection URL dan konversi menjadi link

### 2. **Sistem Komentar**
- Guru dapat memberikan komentar pada postingan
- Edit dan hapus komentar (hanya pemilik komentar)
- Tampilan komentar yang rapi dengan timestamp
- Indikator "diedit" untuk komentar yang telah dimodifikasi

### 3. **Sistem Like/Unlike**
- Tombol like untuk menunjukkan apresiasi
- Tracking like per user (tidak bisa like berkali-kali)
- Counter jumlah like real-time
- Visual feedback untuk status like

### 4. **Pencarian dan Filter**
- Pencarian berdasarkan judul dan isi postingan
- Filter berdasarkan kategori
- Real-time search tanpa reload halaman
- Pesan "tidak ada hasil" ketika pencarian kosong

### 5. **Manajemen Konten**
- Edit dan hapus postingan (hanya pemilik)
- Indikator "diedit" untuk postingan yang dimodifikasi
- Konfirmasi sebelum menghapus
- Notifikasi sukses/error untuk setiap aksi

## Struktur Database Firestore

### Collection: `forum_posts`
```javascript
{
  id: "auto-generated-id",
  title: "Judul Postingan",
  content: "Isi postingan dengan support hashtag #kurikulummerdeka",
  category: "SCAMPER", // Umum, SCAMPER, RPP, Asesmen, dll.
  author: "Nama Guru",
  authorId: "firebase-user-uid",
  authorEmail: "guru@email.com",
  createdAt: Timestamp,
  editedAt: Timestamp, // Optional
  isEdited: false,
  likes: 0,
  likedBy: ["user-uid-1", "user-uid-2"], // Array of user IDs who liked
  comments: [
    {
      text: "Isi komentar",
      author: "Nama Komentator",
      authorId: "firebase-user-uid",
      createdAt: "ISO-string",
      editedAt: "ISO-string", // Optional
      isEdited: false
    }
  ],
  tags: ["kurikulummerdeka", "asesmen"] // Extracted from hashtags
}
```

## Teknologi yang Digunakan

### Frontend
- **HTML5** dengan semantic markup
- **Tailwind CSS** untuk styling responsif
- **Vanilla JavaScript** (ES6+) dengan modules
- **Firebase SDK v10.12.2** untuk Firestore dan Auth

### Backend
- **Firebase Firestore** sebagai database NoSQL
- **Firebase Authentication** untuk manajemen user
- **Real-time updates** dengan Firestore listeners

## File Structure
```
src/
├── pages/forum/
│   └── forum.html              # Halaman utama forum
├── js/pages/forum/
│   ├── forum-logic.js          # Logic utama forum
│   └── forum-search.js         # Logic pencarian dan filter
└── js/services/
    └── firebase-init.js        # Konfigurasi Firebase
```

## Fitur Keamanan

### 1. **Authentication**
- Hanya user yang login dapat membuat postingan dan komentar
- Validasi user session dengan Firebase Auth
- Redirect ke login jika belum authenticated

### 2. **Authorization**
- Hanya pemilik postingan yang dapat edit/hapus postingan
- Hanya pemilik komentar yang dapat edit/hapus komentar
- Validasi ownership berdasarkan Firebase UID

### 3. **Data Validation**
- Input sanitization untuk mencegah XSS
- Required field validation
- Trim whitespace dari input
- Maximum character limits

## Error Handling & Fallbacks

### 1. **Offline Support**
- LocalStorage fallback ketika Firestore tidak tersedia
- Sync data ketika koneksi kembali normal
- Cache user likes di localStorage

### 2. **Error Messages**
- Notifikasi user-friendly untuk setiap error
- Fallback ke localStorage jika Firestore gagal
- Graceful degradation untuk fitur yang tidak critical

### 3. **Loading States**
- Loading spinner saat fetch data
- Disabled state untuk tombol saat proses
- Progress indicator untuk operasi yang memakan waktu

## Performance Optimizations

### 1. **Database Queries**
- Limit 50 postingan per load
- Order by timestamp (newest first)
- Index pada field yang sering di-query

### 2. **Frontend Optimizations**
- Lazy loading untuk komentar
- Debounced search input
- Efficient DOM manipulation
- Event delegation untuk dynamic content

### 3. **Caching Strategy**
- Cache user likes di localStorage
- Cache edited posts untuk offline editing
- Mutation observer untuk real-time UI updates

## User Experience Features

### 1. **Responsive Design**
- Mobile-first approach
- Touch-friendly buttons
- Optimized untuk berbagai screen size
- Smooth animations dan transitions

### 2. **Accessibility**
- Semantic HTML structure
- ARIA labels untuk screen readers
- Keyboard navigation support
- High contrast colors

### 3. **Visual Feedback**
- Hover states untuk interactive elements
- Loading indicators
- Success/error notifications
- Visual distinction untuk owned content

## Deployment Considerations

### 1. **Environment Variables**
- Firebase config di file terpisah
- API keys management
- Environment-specific settings

### 2. **Security Rules**
```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /forum_posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        request.auth.uid == resource.data.authorId;
    }
  }
}
```

### 3. **Monitoring**
- Error tracking dengan console.error
- Performance monitoring
- User analytics untuk engagement

## Future Enhancements

### 1. **Advanced Features**
- Reply to comments (nested comments)
- Mention system (@username)
- File attachments (images, documents)
- Real-time notifications

### 2. **Moderation**
- Report inappropriate content
- Admin moderation panel
- Content filtering
- User reputation system

### 3. **Analytics**
- Popular topics tracking
- User engagement metrics
- Content performance analytics
- Search analytics

## Troubleshooting

### Common Issues
1. **Posts not loading**: Check Firebase connection and authentication
2. **Like not working**: Verify user is logged in and has proper permissions
3. **Search not working**: Check if posts are properly loaded in DOM
4. **Comments not showing**: Verify Firestore security rules allow read access

### Debug Mode
Enable debug mode dengan menambahkan `?debug=true` di URL untuk melihat detailed logs.

---

**Catatan**: Dokumentasi ini akan terus diperbarui seiring dengan pengembangan fitur baru dan perbaikan bug.
