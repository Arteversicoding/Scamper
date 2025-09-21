
import { db, auth } from '../../services/firebase-init.js';
import { ForumUtils } from '../../utils/forum-utils.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    serverTimestamp, 
    doc, 
    updateDoc, 
    increment, 
    arrayUnion, 
    deleteDoc, 
    query, 
    orderBy, 
    limit, 
    where,
    getDoc,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const newPostButton = document.getElementById('new-post-button');
    const newPostModal = document.getElementById('new-post-modal');
    const newPostForm = document.getElementById('new-post-form');
    const cancelPostButton = document.getElementById('cancel-post-button');
    const forumThreads = document.getElementById('forum-threads');

    let currentUser = null;
    let userLikes = new Set(); // Track user's likes
    let isLoading = false;

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            loadUserLikes();
        } else {
            currentUser = null;
            userLikes.clear();
        }
        fetchPosts();
    });

    // Load user's likes from localStorage or Firestore
    async function loadUserLikes() {
        if (!currentUser) return;
        
        try {
            const likesKey = `user_likes_${currentUser.uid}`;
            const savedLikes = localStorage.getItem(likesKey);
            if (savedLikes) {
                userLikes = new Set(JSON.parse(savedLikes));
            }
        } catch (error) {
            console.error('Error loading user likes:', error);
        }
    }

    // Save user's likes to localStorage
    function saveUserLikes() {
        if (!currentUser) return;
        
        try {
            const likesKey = `user_likes_${currentUser.uid}`;
            localStorage.setItem(likesKey, JSON.stringify([...userLikes]));
        } catch (error) {
            console.error('Error saving user likes:', error);
        }
    }

    // Show/hide modal
    newPostButton.addEventListener('click', () => {
        if (currentUser) {
            newPostModal.classList.remove('hidden');
        } else {
            alert('Anda harus login untuk membuat post.');
            window.location.href = 'login.html';
        }
    });

    cancelPostButton.addEventListener('click', () => {
        newPostModal.classList.add('hidden');
    });

    // Close modal button
    const closeModalButton = document.getElementById('close-modal-button');
    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => {
            newPostModal.classList.add('hidden');
        });
    }

    // Close modal when clicking outside
    newPostModal.addEventListener('click', (e) => {
        if (e.target === newPostModal) {
            newPostModal.classList.add('hidden');
        }
    });

    // Handle new post submission
    newPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert('Anda harus login untuk membuat post.');
            return;
        }

        if (isLoading) return;
        isLoading = true;

        const title = document.getElementById('post-title').value.trim();
        const content = document.getElementById('post-content').value.trim();
        const category = document.getElementById('post-category')?.value || 'Umum';

        // Validate post data
        const validation = ForumUtils.validatePost({ title, content });
        if (!validation.isValid) {
            showNotification(validation.errors.join(', '), 'error');
            isLoading = false;
            return;
        }

        try {
            const submitButton = newPostForm.querySelector('button[type="submit"]');
            submitButton.textContent = 'Mengirim...';
            submitButton.disabled = true;

            await addDoc(collection(db, 'forum_posts'), {
                title,
                content,
                category,
                author: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
                authorId: currentUser.uid,
                authorEmail: currentUser.email,
                createdAt: serverTimestamp(),
                likes: 0,
                likedBy: [],
                comments: [],
                isEdited: false,
                tags: extractTags(content)
            });
            
            newPostForm.reset();
            newPostModal.classList.add('hidden');
            showNotification('Postingan berhasil dibuat!', 'success');
            fetchPosts();
        } catch (error) {
            ForumUtils.logError(error, 'Creating new post');
            showNotification('Gagal membuat postingan. Silakan coba lagi.', 'error');
        } finally {
            const submitButton = newPostForm.querySelector('button[type="submit"]');
            submitButton.textContent = 'Kirim';
            submitButton.disabled = false;
            isLoading = false;
        }
    });

    // Extract hashtags from content (using utility)
    function extractTags(content) {
        return ForumUtils.extractHashtags(content);
    }

    // Show notification (using utility)
    function showNotification(message, type = 'info') {
        ForumUtils.showNotification(message, type);
    }

    // Fetch and display posts
    async function fetchPosts() {
        try {
            showLoadingState();
            
            // Fetch posts from Firestore ordered by creation date (newest first)
            const postsQuery = query(
                collection(db, 'forum_posts'), 
                orderBy('createdAt', 'desc'),
                limit(50)
            );
            
            const querySnapshot = await getDocs(postsQuery);
            const posts = [];
            querySnapshot.forEach((doc) => {
                const postData = { id: doc.id, ...doc.data() };
                // Convert Firestore timestamp to JavaScript Date
                if (postData.createdAt && postData.createdAt.toDate) {
                    postData.createdAt = postData.createdAt.toDate();
                }
                posts.push(postData);
            });
            
            // Filter out deleted posts (stored in localStorage)
            const deletedPosts = JSON.parse(localStorage.getItem('deletedPosts') || '[]');
            let filteredPosts = posts.filter(post => !deletedPosts.includes(post.id));
            
            // Apply local edits to posts
            const editedPosts = JSON.parse(localStorage.getItem('editedPosts') || '{}');
            filteredPosts = filteredPosts.map(post => {
                if (editedPosts[post.id]) {
                    return { ...post, ...editedPosts[post.id] };
                }
                return post;
            });
            
            // If no posts from Firestore, try localStorage fallback
            if (filteredPosts.length === 0) {
                const localPosts = JSON.parse(localStorage.getItem('forumPosts') || '[]');
                filteredPosts.push(...localPosts);
            }
            
            displayPosts(filteredPosts);
        } catch (error) {
            ForumUtils.logError(error, 'Fetching posts');
            showNotification('Gagal memuat postingan. Menggunakan data lokal.', 'error');
            // Fallback to localStorage if Firestore fails
            const localPosts = JSON.parse(localStorage.getItem('forumPosts') || '[]');
            displayPosts(localPosts);
        } finally {
            hideLoadingState();
        }
    }

    // Show loading state
    function showLoadingState() {
        forumThreads.innerHTML = `
            <div class="flex justify-center items-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span class="ml-2 text-gray-600">Memuat postingan...</span>
            </div>
        `;
    }

    // Hide loading state
    function hideLoadingState() {
        // Loading will be replaced by actual posts
    }

    function displayPosts(posts) {
        forumThreads.innerHTML = ''; // Clear existing posts
        
        if (posts.length === 0) {
            forumThreads.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-gray-400 text-6xl mb-4">💬</div>
                    <h3 class="text-lg font-semibold text-gray-600 mb-2">Belum ada diskusi</h3>
                    <p class="text-gray-500 mb-4">Jadilah yang pertama memulai diskusi di forum guru!</p>
                    <button onclick="document.getElementById('new-post-button').click()" class="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all">
                        Buat Postingan Pertama
                    </button>
                </div>
            `;
            return;
        }
        
        posts.forEach((post) => {
            const postElement = createPostElement(post.id, post);
            forumThreads.appendChild(postElement);
        });
    }

    // Create post element
    function createPostElement(id, post) {
        const postElement = document.createElement('div');
        postElement.className = 'bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-shadow';
        
        const isOwner = currentUser && currentUser.uid === post.authorId;
        const isLiked = userLikes.has(id);
        const timeAgo = getTimeAgo(post.createdAt);
        
        const ownerActions = isOwner ? `
            <div class="flex space-x-2 ml-4">
                <button data-id="${id}" class="edit-post-button text-blue-500 hover:text-blue-700 text-xs p-1 rounded hover:bg-blue-50 transition-colors" title="Edit postingan">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button data-id="${id}" class="delete-post-button text-red-500 hover:text-red-700 text-xs p-1 rounded hover:bg-red-50 transition-colors" title="Hapus postingan">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/></svg>
                </button>
            </div>
        ` : '';

        const categoryBadge = post.category ? `
            <span class="inline-block bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-medium">${post.category}</span>
        ` : '';

        const editedBadge = post.isEdited ? `
            <span class="text-gray-400 text-xs ml-2" title="Postingan telah diedit">(diedit)</span>
        ` : '';

        postElement.innerHTML = `
            <div class="flex items-start space-x-4">
                <div class="w-12 h-12 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-md">${getInitials(post.author)}</div>
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-2">
                            <h4 class="font-bold text-gray-800">${post.author}</h4>
                            ${editedBadge}
                        </div>
                        <div class="flex items-center">
                            <span class="text-gray-400 text-xs" title="${post.createdAt ? new Date(post.createdAt).toLocaleString('id-ID') : 'Baru saja'}">${timeAgo}</span>
                            ${ownerActions}
                        </div>
                    </div>
                    <h3 id="post-title-${id}" class="font-semibold text-gray-800 mb-2">${post.title}</h3>
                    <p id="post-content-${id}" class="text-gray-600 text-sm mb-3 whitespace-pre-wrap">${formatContent(post.content)}</p>
                    ${categoryBadge}
                    <div class="flex items-center justify-between text-sm text-gray-500 mt-3">
                        <div class="flex space-x-4">
                            <button data-id="${id}" class="like-button flex items-center space-x-1 px-2 py-1 rounded-lg transition-colors ${
                                isLiked ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
                            }" title="${isLiked ? 'Batal suka' : 'Suka postingan ini'}">
                                <span>${isLiked ? '👍' : '👍'}</span>
                                <span>${post.likes || 0}</span>
                            </button>
                            <button data-id="${id}" class="comment-button flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors" title="Lihat komentar">
                                <span>💬</span>
                                <span>${(post.comments || []).length}</span>
                            </button>
                        </div>
                    </div>
                    <div id="comments-section-${id}" class="mt-4 hidden">
                        <div id="comments-list-${id}" class="space-y-3 mb-4 max-h-60 overflow-y-auto">
                            ${(post.comments || []).map((comment, index) => createCommentElement(id, comment, index)).join('')}
                        </div>
                        ${currentUser ? `
                            <form class="add-comment-form" data-id="${id}">
                                <div class="flex space-x-2">
                                    <input type="text" class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Tulis komentar..." required>
                                    <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors">Kirim</button>
                                </div>
                            </form>
                        ` : `
                            <p class="text-gray-500 text-sm text-center py-2">Login untuk berkomentar</p>
                        `}
                    </div>
                </div>
            </div>
        `;
        return postElement;
    }

    // Get user initials (using utility)
    function getInitials(name) {
        return ForumUtils.getInitials(name);
    }

    // Format content (using utility)
    function formatContent(content) {
        return ForumUtils.formatContent(content);
    }

    // Get time ago string (using utility)
    function getTimeAgo(date) {
        return ForumUtils.getTimeAgo(date);
    }

    // Create comment element
    function createCommentElement(postId, comment, commentIndex) {
        if (!comment || !comment.author || !comment.text) {
            return ''; // Skip invalid comments
        }
        
        const isCommentOwner = currentUser && currentUser.uid === comment.authorId;
        const commentTime = getTimeAgo(comment.createdAt);
        const editedBadge = comment.isEdited ? '<span class="text-gray-400 text-xs ml-1">(diedit)</span>' : '';
        
        const commentActions = isCommentOwner ? `
            <div class="flex space-x-1 ml-2">
                <button data-post-id="${postId}" data-comment-index="${commentIndex}" class="edit-comment-button text-blue-500 hover:text-blue-700 text-xs p-1 rounded hover:bg-blue-50 transition-colors" title="Edit komentar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button data-post-id="${postId}" data-comment-index="${commentIndex}" class="delete-comment-button text-red-500 hover:text-red-700 text-xs p-1 rounded hover:bg-red-50 transition-colors" title="Hapus komentar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/></svg>
                </button>
            </div>
        ` : '';

        return `
            <div class="bg-gray-50 rounded-lg p-3 border-l-2 border-indigo-200">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-1">
                            <span class="font-medium text-gray-700 text-sm">${comment.author}</span>
                            <span class="text-gray-400 text-xs">${commentTime}</span>
                            ${editedBadge}
                        </div>
                        <p id="comment-${postId}-${commentIndex}" class="text-gray-600 text-sm whitespace-pre-wrap">${formatContent(comment.text)}</p>
                    </div>
                    ${commentActions}
                </div>
            </div>
        `;
    }

    // Handle likes and comments
    forumThreads.addEventListener('click', async (e) => {
        // Like/Unlike post function
        async function toggleLike(postId) {
            if (!currentUser) {
                showNotification('Anda harus login untuk menyukai postingan.', 'error');
                return;
            }

            try {
                const postRef = doc(db, 'forum_posts', postId);
                const isCurrentlyLiked = userLikes.has(postId);
                
                if (isCurrentlyLiked) {
                    // Unlike the post
                    await updateDoc(postRef, {
                        likes: increment(-1),
                        likedBy: arrayRemove(currentUser.uid)
                    });
                    userLikes.delete(postId);
                } else {
                    // Like the post
                    await updateDoc(postRef, {
                        likes: increment(1),
                        likedBy: arrayUnion(currentUser.uid)
                    });
                    userLikes.add(postId);
                }
                
                saveUserLikes();
                fetchPosts(); // Refresh to show updated likes
            } catch (error) {
                ForumUtils.logError(error, 'Toggling like');
                showNotification('Gagal memperbarui like. Silakan coba lagi.', 'error');
            }
        }

        if (e.target.closest('.like-button')) {
            const postId = e.target.closest('.like-button').dataset.id;
            toggleLike(postId);
        }

        if (e.target.closest('.comment-button')) {
            const postId = e.target.closest('.comment-button').dataset.id;
            const commentsSection = document.getElementById(`comments-section-${postId}`);
            commentsSection.classList.toggle('hidden');
        }
    });

    forumThreads.addEventListener('submit', async (e) => {
        if (e.target.classList.contains('add-comment-form')) {
            e.preventDefault();
            if (!currentUser) {
                alert('Anda harus login untuk berkomentar.');
                return;
            }

            const postId = e.target.dataset.id;
            const commentInput = e.target.querySelector('input');
            const commentText = commentInput.value;

            // Validate comment
            const validation = ForumUtils.validateComment({ text: commentText });
            if (!validation.isValid) {
                showNotification(validation.errors.join(', '), 'error');
                return;
            }

            try {
                const comment = {
                    text: commentText.trim(),
                    author: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
                    authorId: currentUser.uid,
                    createdAt: new Date().toISOString()
                };

                const postRef = doc(db, 'forum_posts', postId);
                await updateDoc(postRef, {
                    comments: arrayUnion(comment)
                });
                
                commentInput.value = '';
                showNotification('Komentar berhasil ditambahkan!', 'success');
                fetchPosts(); // Refresh to show new comment
            } catch (error) {
                ForumUtils.logError(error, 'Adding comment');
                showNotification('Gagal menambahkan komentar. Silakan coba lagi.', 'error');
            }
        }
    });

    // Handle edit and delete actions
    forumThreads.addEventListener('click', async (e) => {
        // Edit post
        if (e.target.closest('.edit-post-button')) {
            const postId = e.target.closest('.edit-post-button').dataset.id;
            editPost(postId);
        }

        // Delete post
        if (e.target.closest('.delete-post-button')) {
            const postId = e.target.closest('.delete-post-button').dataset.id;
            deletePost(postId);
        }

        // Edit comment
        if (e.target.closest('.edit-comment-button')) {
            const button = e.target.closest('.edit-comment-button');
            const postId = button.dataset.postId;
            const commentIndex = parseInt(button.dataset.commentIndex);
            editComment(postId, commentIndex);
        }

        // Delete comment
        if (e.target.closest('.delete-comment-button')) {
            const button = e.target.closest('.delete-comment-button');
            const postId = button.dataset.postId;
            const commentIndex = parseInt(button.dataset.commentIndex);
            deleteComment(postId, commentIndex);
        }
    });

    // Edit post function
    async function editPost(postId) {
        const titleElement = document.getElementById(`post-title-${postId}`);
        const contentElement = document.getElementById(`post-content-${postId}`);
        
        const currentTitle = titleElement.textContent;
        const currentContent = contentElement.textContent;

        const newTitle = prompt('Edit judul:', currentTitle);
        if (newTitle === null) return; // User cancelled

        const newContent = prompt('Edit isi:', currentContent);
        if (newContent === null) return; // User cancelled

        if (newTitle.trim() === '' || newContent.trim() === '') {
            alert('Judul dan isi tidak boleh kosong!');
            return;
        }

        try {
            // Try Firestore first, fallback to localStorage
            try {
                const postRef = doc(db, 'forum_posts', postId);
                await updateDoc(postRef, {
                    title: newTitle.trim(),
                    content: newContent.trim(),
                    isEdited: true,
                    editedAt: serverTimestamp()
                });
                showNotification('Postingan berhasil diperbarui!', 'success');
            } catch (firestoreError) {
                console.log('Firestore edit failed, using localStorage fallback');
                // Fallback: store edit in localStorage
                const editedPosts = JSON.parse(localStorage.getItem('editedPosts') || '{}');
                editedPosts[postId] = {
                    title: newTitle.trim(),
                    content: newContent.trim(),
                    isEdited: true,
                    editedAt: new Date().toISOString()
                };
                localStorage.setItem('editedPosts', JSON.stringify(editedPosts));
                showNotification('Postingan berhasil diperbarui!', 'success');
            }
            fetchPosts(); // Refresh to show updated post
        } catch (error) {
            console.error("Error updating post: ", error);
            showNotification('Gagal mengupdate postingan!', 'error');
        }
    }

    // Delete post function
    async function deletePost(postId) {
        if (!confirm('Apakah Anda yakin ingin menghapus postingan ini?')) {
            return;
        }

        try {
            // Try Firestore first, fallback to localStorage
            try {
                await deleteDoc(doc(db, 'forum_posts', postId));
                showNotification('Postingan berhasil dihapus!', 'success');
            } catch (firestoreError) {
                console.log('Firestore delete failed, using localStorage fallback');
                // Fallback: mark as deleted in localStorage
                const deletedPosts = JSON.parse(localStorage.getItem('deletedPosts') || '[]');
                deletedPosts.push(postId);
                localStorage.setItem('deletedPosts', JSON.stringify(deletedPosts));
                showNotification('Postingan berhasil dihapus!', 'success');
            }
            
            fetchPosts(); // Refresh to remove deleted post
        } catch (error) {
            console.error("Error deleting post: ", error);
            showNotification('Gagal menghapus postingan!', 'error');
        }
    }

    // Edit comment function
    async function editComment(postId, commentIndex) {
        try {
            // Get current post data from Firestore
            const postRef = doc(db, 'forum_posts', postId);
            const postDoc = await getDoc(postRef);
            
            if (!postDoc.exists()) {
                showNotification('Postingan tidak ditemukan!', 'error');
                return;
            }
            
            const currentPost = postDoc.data();
            if (!currentPost.comments || !currentPost.comments[commentIndex]) {
                showNotification('Komentar tidak ditemukan!', 'error');
                return;
            }

            const currentComment = currentPost.comments[commentIndex];
            const newText = prompt('Edit komentar:', currentComment.text);
            
            if (newText === null) return; // User cancelled
            if (newText.trim() === '') {
                showNotification('Komentar tidak boleh kosong!', 'error');
                return;
            }

            // Update the comment in the array
            const updatedComments = [...(currentPost.comments || [])];
            updatedComments[commentIndex] = {
                ...currentComment,
                text: newText.trim(),
                isEdited: true,
                editedAt: new Date().toISOString()
            };

            await updateDoc(postRef, {
                comments: updatedComments
            });
            
            showNotification('Komentar berhasil diperbarui!', 'success');
            fetchPosts(); // Refresh to show updated comment
        } catch (error) {
            console.error("Error updating comment: ", error);
            showNotification('Gagal mengupdate komentar!', 'error');
        }
    }

    // Delete comment function
    async function deleteComment(postId, commentIndex) {
        if (!confirm('Apakah Anda yakin ingin menghapus komentar ini?')) {
            return;
        }

        try {
            // Get current post data from Firestore
            const postRef = doc(db, 'forum_posts', postId);
            const postDoc = await getDoc(postRef);
            
            if (!postDoc.exists()) {
                showNotification('Postingan tidak ditemukan!', 'error');
                return;
            }
            
            const currentPost = postDoc.data();
            if (!currentPost.comments || !currentPost.comments[commentIndex]) {
                showNotification('Komentar tidak ditemukan!', 'error');
                return;
            }

            // Remove the comment from the array
            const updatedComments = (currentPost.comments || []).filter((_, index) => index !== commentIndex);

            await updateDoc(postRef, {
                comments: updatedComments
            });
            
            showNotification('Komentar berhasil dihapus!', 'success');
            fetchPosts(); // Refresh to remove deleted comment
        } catch (error) {
            console.error("Error deleting comment: ", error);
            showNotification('Gagal menghapus komentar!', 'error');
        }
    }
});
