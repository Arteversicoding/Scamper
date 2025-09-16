class BottomNav {
    constructor(activePage = 'home') {
        this.activePage = activePage;
        this.navItems = [
            { 
                id: 'home',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
                label: 'Beranda',
                link: '/index.html'
            },
            { 
                id: 'chat',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
                label: 'Chat',
                link: '/src/pages/chat/chat.html'
            },
            { 
                id: 'forum',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
                label: 'Forum',
                link: '/src/pages/forum/forum.html'
            },
            { 
                id: 'materi',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
                label: 'Materi',
                link: '/src/pages/materi/materi.html'
            },
            { 
                id: 'profile',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
                label: 'Profil',
                link: '/src/pages/profil.html'
            }
        ];
    }

    render() {
        return `
            <div id="bottom-nav" class="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-200 p-4 z-50">
                <div class="flex justify-around items-center max-w-lg mx-auto">
                    ${this.navItems.map(item => `
                        <a href="${item.link}" 
                           data-page="${item.id}" 
                           class="nav-button flex flex-col items-center space-y-1 ${this.activePage === item.id ? 'text-cyan-600' : 'text-gray-500'}">
                            ${item.icon}
                            <span class="text-xs font-medium">${item.label}</span>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }

    static init(activePage = 'home') {
        const nav = new BottomNav(activePage);
        const navElement = document.getElementById('bottom-nav-placeholder');
        if (navElement) {
            navElement.outerHTML = nav.render();
        }
        return nav;
    }
}

export default BottomNav;
