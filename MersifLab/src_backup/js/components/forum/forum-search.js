document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const forumThreads = document.getElementById('forum-threads');
    const threadItems = Array.from(forumThreads.children).filter(child => child.classList.contains('bg-white'));

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();

        threadItems.forEach(item => {
            const title = item.querySelector('h3').textContent.toLowerCase();
            const content = item.querySelector('p').textContent.toLowerCase();
            const isVisible = title.includes(searchTerm) || content.includes(searchTerm);
            item.style.display = isVisible ? '' : 'none';
        });
    });
});
