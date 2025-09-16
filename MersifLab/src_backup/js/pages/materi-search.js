document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const materiList = document.getElementById('materi-list');
    const materiItems = Array.from(materiList.children).filter(child => child.classList.contains('bg-white'));

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();

        materiItems.forEach(item => {
            const title = item.querySelector('h4').textContent.toLowerCase();
            const description = item.querySelector('p').textContent.toLowerCase();
            const isVisible = title.includes(searchTerm) || description.includes(searchTerm);
            item.style.display = isVisible ? '' : 'none';
        });
    });
});
