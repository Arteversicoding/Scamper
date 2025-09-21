document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const forumThreads = document.getElementById('forum-threads');
    const categoryButtons = document.querySelectorAll('.flex.space-x-2.overflow-x-auto button');
    
    let allPosts = []; // Store all posts for filtering
    let currentCategory = 'Semua';
    let currentSearchTerm = '';

    // Function to filter and display posts
    function filterPosts() {
        const posts = Array.from(forumThreads.children).filter(child => 
            child.classList.contains('bg-white') && child.classList.contains('rounded-2xl')
        );

        posts.forEach(post => {
            const titleElement = post.querySelector('h3');
            const contentElement = post.querySelector('p');
            const categoryElement = post.querySelector('.bg-indigo-100');
            
            if (!titleElement || !contentElement) return;
            
            const title = titleElement.textContent.toLowerCase();
            const content = contentElement.textContent.toLowerCase();
            const category = categoryElement ? categoryElement.textContent.trim() : 'Umum';
            
            // Check search term match
            const matchesSearch = currentSearchTerm === '' || 
                title.includes(currentSearchTerm) || 
                content.includes(currentSearchTerm);
            
            // Check category match
            const matchesCategory = currentCategory === 'Semua' || 
                category === currentCategory ||
                (currentCategory === 'SCAMPER' && (title.includes('scamper') || content.includes('scamper'))) ||
                (currentCategory === 'RPP' && (title.includes('rpp') || content.includes('rpp'))) ||
                (currentCategory === 'Asesmen' && (title.includes('asesmen') || content.includes('asesmen'))) ||
                (currentCategory === 'Kurikulum' && (title.includes('kurikulum') || content.includes('kurikulum')));
            
            // Show/hide post based on filters
            const shouldShow = matchesSearch && matchesCategory;
            post.style.display = shouldShow ? 'block' : 'none';
        });

        // Show message if no posts match
        const visiblePosts = posts.filter(post => post.style.display !== 'none');
        if (visiblePosts.length === 0 && posts.length > 0) {
            showNoResultsMessage();
        } else {
            hideNoResultsMessage();
        }
    }

    // Search input handler
    searchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value.toLowerCase().trim();
        filterPosts();
    });

    // Category button handlers
    categoryButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update active button
            categoryButtons.forEach(btn => {
                btn.className = btn.className.replace('bg-gradient-to-r from-blue-600 to-purple-600 text-white', 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200');
            });
            
            button.className = button.className.replace('bg-indigo-100 text-indigo-600 hover:bg-indigo-200', 'bg-gradient-to-r from-blue-600 to-purple-600 text-white');
            
            currentCategory = button.textContent.trim();
            filterPosts();
        });
    });

    // Show no results message
    function showNoResultsMessage() {
        hideNoResultsMessage(); // Remove existing message first
        
        const noResultsDiv = document.createElement('div');
        noResultsDiv.id = 'no-results-message';
        noResultsDiv.className = 'text-center py-8';
        noResultsDiv.innerHTML = `
            <div class="text-gray-400 text-4xl mb-3">🔍</div>
            <h3 class="text-lg font-semibold text-gray-600 mb-2">Tidak ada hasil ditemukan</h3>
            <p class="text-gray-500">Coba gunakan kata kunci yang berbeda atau ubah kategori pencarian.</p>
        `;
        
        forumThreads.appendChild(noResultsDiv);
    }

    // Hide no results message
    function hideNoResultsMessage() {
        const existingMessage = document.getElementById('no-results-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    }

    // Re-filter when new posts are loaded
    const observer = new MutationObserver(() => {
        filterPosts();
    });
    
    observer.observe(forumThreads, { childList: true });
});
