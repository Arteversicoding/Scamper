import { AuthService } from './auth-service.js';

const authService = new AuthService();

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

async function handleLogin(e) {
    e.preventDefault();
    const errorMessageDiv = document.getElementById('error-message');
    errorMessageDiv.textContent = ''; // Bersihkan error lama

    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
        const result = await authService.login(email, password);
        
        // Check if user is admin and redirect accordingly
        if (result.user.role === 'admin') {
            window.location.href = 'admin-dashboard.html';
        } else {
            window.location.href = 'index.html';
        }
    } catch (error) {
        errorMessageDiv.textContent = getFriendlyErrorMessage(error.code);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const errorMessageDiv = document.getElementById('error-message');
    errorMessageDiv.textContent = ''; // Bersihkan error lama

    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmPassword = e.target['confirm-password'].value;

    if (password !== confirmPassword) {
        errorMessageDiv.textContent = 'Password dan konfirmasi password tidak cocok.';
        return;
    }

    try {
        await authService.register(email, password);
        window.location.href = 'index.html'; // Arahkan ke halaman utama
    } catch (error) {
        errorMessageDiv.textContent = getFriendlyErrorMessage(error.code);
    }
}

function getFriendlyErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/invalid-email':
            return 'Format email tidak valid.';
        case 'auth/user-not-found':
        case 'auth/invalid-credential':
            return 'Email atau password salah.';
        case 'auth/wrong-password':
            return 'Password salah. Silakan coba lagi.';
        case 'auth/email-already-in-use':
            return 'Email ini sudah terdaftar. Silakan login.';
        case 'auth/weak-password':
            return 'Password terlalu lemah (minimal 6 karakter).';
        default:
            console.error('Firebase Auth Error:', errorCode);
            return 'Terjadi kesalahan. Silakan coba lagi.';
    }
}