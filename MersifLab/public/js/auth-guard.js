import { authService } from './auth-service.js';

// Check if user is authenticated
const isAuthenticated = () => {
    return authService.isAuthenticated();
};

// Redirect to login if not authenticated
export const requireAuth = (to, from, next) => {
    if (!isAuthenticated()) {
        window.location.href = '/auth/login.html';
        return;
    }
    next();
};

// Redirect to home if already logged in
export const requireGuest = (to, from, next) => {
    if (isAuthenticated()) {
        window.location.href = '/';
        return;
    }
    next();
};
