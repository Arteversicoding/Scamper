// Main JavaScript entry point for the application
console.log('MersifLab application initialized');

// Initialize any global functionality here
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    
    // Add any initialization code here
    // For example, check authentication status, load user data, etc.
});

// Export any functions that need to be used in other modules
export function showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-md text-white ${
        type === 'error' ? 'bg-red-500' : 
        type === 'success' ? 'bg-green-500' : 'bg-blue-500'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Add any other utility functions here
