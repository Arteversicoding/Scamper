import { auth } from "./firebase-init.js";

// This script checks if a user is logged in.
// If not, it redirects to the login page.
// Add this script to every page you want to protect.

auth.onAuthStateChanged(function(user) {
  const currentPath = window.location.pathname;
  // If page name contains 'admin', require admin login page for unauthenticated users
  const isAdminArea = currentPath.includes('admin-');
  if (!user) {
    if (isAdminArea) {
      if (!currentPath.endsWith('login.html')) {
        window.location.href = 'login.html';
      }
    } else {
      if (!currentPath.endsWith('login.html') && !currentPath.endsWith('register.html')) {
        window.location.href = 'login.html';
      }
    }
  } else {
    // User is authenticated, redirect to appropriate dashboard if on login/register
    if (currentPath.endsWith('login.html') || currentPath.endsWith('register.html')) {
      window.location.href = 'index.html';
    }
  }
});