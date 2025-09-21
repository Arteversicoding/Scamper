# Firestore Security Rules Deployment Guide

## 📋 Overview
File ini berisi panduan untuk deploy Firestore security rules yang mendukung semua fitur aplikasi termasuk forum guru yang baru diimplementasikan.

## 🔒 Security Rules Summary

### Collections yang Didukung:
1. **`posts`** - Postingan umum (existing)
2. **`forum_posts`** - Postingan forum guru (NEW)
3. **`users`** - Profil pengguna dan chat history
4. **`materials`** - Materi pembelajaran
5. **`courses`** - Kursus/mata pelajaran
6. **`chat_messages`** - Pesan chat individual
7. **`extracted_content`** - Konten PDF yang diekstrak

## 🚀 Cara Deploy Rules

### 1. Via Firebase Console
1. Buka [Firebase Console](https://console.firebase.google.com)
2. Pilih project `mersiflab-63b3c`
3. Navigasi ke **Firestore Database** > **Rules**
4. Copy paste isi file `firestore.rules` ke editor
5. Klik **Publish** untuk deploy

### 2. Via Firebase CLI
```bash
# Install Firebase CLI jika belum ada
npm install -g firebase-tools

# Login ke Firebase
firebase login

# Initialize project (jika belum)
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

## 🛡️ Forum Security Rules Explanation

### Collection: `forum_posts`

#### Read Access
```javascript
allow read: if request.auth != null;
```
- ✅ Semua user yang sudah login bisa membaca postingan
- ❌ User yang belum login tidak bisa akses

#### Create Access
```javascript
allow create: if request.auth != null 
  && request.resource.data.authorId == request.auth.uid;
```
- ✅ User yang login bisa membuat postingan
- ✅ authorId harus sama dengan UID user yang login
- ❌ Tidak bisa membuat postingan atas nama orang lain

#### Update Access
```javascript
allow update: if request.auth != null 
  && (
    // Author dapat edit postingan sendiri
    request.auth.uid == resource.data.authorId
    // Semua user dapat update likes dan comments
    || (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likes', 'likedBy', 'comments']))
  );
```
- ✅ Pemilik postingan bisa edit postingan sendiri
- ✅ Semua user bisa menambah like dan komentar
- ❌ User lain tidak bisa edit judul/isi postingan orang lain

#### Delete Access
```javascript
allow delete: if request.auth != null 
  && request.auth.uid == resource.data.authorId;
```
- ✅ Hanya pemilik postingan yang bisa hapus
- ❌ User lain tidak bisa hapus postingan orang lain

## 🔍 Testing Rules

### 1. Manual Testing
Gunakan Firebase Console > Firestore > Rules Playground untuk test:

```javascript
// Test read access
// Auth: Authenticated user
// Path: /forum_posts/test-post-id
// Operation: get
// Expected: Allow

// Test create access
// Auth: Authenticated user with UID "user123"
// Path: /forum_posts/new-post-id
// Data: { authorId: "user123", title: "Test", content: "Test" }
// Operation: create
// Expected: Allow

// Test unauthorized create
// Auth: Authenticated user with UID "user123"
// Path: /forum_posts/new-post-id
// Data: { authorId: "user456", title: "Test", content: "Test" }
// Operation: create
// Expected: Deny
```

### 2. Automated Testing
Jalankan test dengan menambahkan `?test=true` di URL forum:
```
http://localhost:3000/pages/forum/forum.html?test=true
```

## ⚠️ Important Notes

### Security Considerations
1. **Authentication Required**: Semua operasi forum memerlukan login
2. **Ownership Validation**: Hanya pemilik yang bisa edit/delete
3. **Data Integrity**: authorId harus match dengan user yang login
4. **Rate Limiting**: Implementasi di client-side untuk prevent spam

### Performance Considerations
1. **Index Requirements**: Pastikan index untuk `createdAt` dan `authorId`
2. **Query Limits**: Batasi jumlah dokumen per query (max 50)
3. **Offline Support**: Rules mendukung offline caching

### Monitoring
1. **Security Rules Usage**: Monitor di Firebase Console > Usage
2. **Denied Requests**: Check logs untuk request yang ditolak
3. **Performance**: Monitor query performance dan costs

## 🔧 Troubleshooting

### Common Issues

#### "Permission denied" saat create post
- **Cause**: authorId tidak sama dengan user UID
- **Solution**: Pastikan `authorId: currentUser.uid` di client code

#### "Permission denied" saat update likes
- **Cause**: Field selain `likes`, `likedBy`, `comments` ikut terupdate
- **Solution**: Pastikan hanya update field yang diizinkan

#### "Permission denied" saat delete post
- **Cause**: User bukan pemilik postingan
- **Solution**: Cek `resource.data.authorId == request.auth.uid`

### Debug Steps
1. Check Firebase Console > Firestore > Usage untuk error details
2. Gunakan Rules Playground untuk simulate operations
3. Verify user authentication status
4. Check client-side error logs

## 📊 Rules Performance

### Optimized for:
- ✅ Fast read operations untuk semua authenticated users
- ✅ Secure write operations dengan ownership validation
- ✅ Efficient like/comment updates
- ✅ Scalable untuk ribuan users dan posts

### Limitations:
- ❌ Tidak ada role-based access (admin/moderator)
- ❌ Tidak ada content moderation rules
- ❌ Tidak ada rate limiting di database level

## 🚀 Future Enhancements

### Planned Improvements:
1. **Admin Rules**: Special permissions untuk admin/moderator
2. **Content Moderation**: Auto-filter inappropriate content
3. **Rate Limiting**: Database-level rate limiting
4. **Advanced Permissions**: Role-based access control

### Migration Path:
1. Deploy current rules untuk basic functionality
2. Add admin collection dan rules
3. Implement content moderation
4. Add advanced permissions

---

**Status**: ✅ Ready for Production
**Last Updated**: 2025-09-21
**Version**: 1.0.0
