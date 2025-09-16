// Auth Service for handling authentication logic
class AuthService {
    constructor() {
        this.currentUser = null;
    }

    async login(email, password) {
        // Simulate API call
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (email && password) {
                    this.currentUser = { email };
                    localStorage.setItem('user', JSON.stringify({ email }));
                    resolve({ success: true, user: this.currentUser });
                } else {
                    reject(new Error('Invalid credentials'));
                }
            }, 1000);
        });
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('user');
    }

    isAuthenticated() {
        const user = localStorage.getItem('user');
        return user !== null;
    }

    getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
}

export const authService = new AuthService();
