// Forum Utility Functions
// Shared utilities for forum functionality

export class ForumUtils {
    // Sanitize HTML content to prevent XSS
    static sanitizeHTML(str) {
        if (!str) return '';
        
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Format text with hashtags and links
    static formatContent(content) {
        if (!content) return '';
        
        // Sanitize first
        let formatted = this.sanitizeHTML(content);
        
        // Convert hashtags to styled spans
        formatted = formatted.replace(/#(\w+)/g, '<span class="text-indigo-600 font-medium">#$1</span>');
        
        // Convert URLs to links (basic regex)
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        formatted = formatted.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>');
        
        return formatted;
    }

    // Extract hashtags from content
    static extractHashtags(content) {
        if (!content) return [];
        
        const tagRegex = /#(\w+)/g;
        const tags = [];
        let match;
        
        while ((match = tagRegex.exec(content)) !== null) {
            tags.push(match[1].toLowerCase());
        }
        
        return [...new Set(tags)]; // Remove duplicates
    }

    // Get user initials from name
    static getInitials(name) {
        if (!name) return 'AN';
        
        const words = name.trim().split(' ');
        if (words.length === 1) {
            return words[0].substring(0, 2).toUpperCase();
        }
        
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }

    // Format time ago string
    static getTimeAgo(date) {
        if (!date) return 'Baru saja';
        
        const now = new Date();
        const postDate = date instanceof Date ? date : new Date(date);
        const diffMs = now - postDate;
        
        // Handle invalid dates
        if (isNaN(diffMs)) return 'Waktu tidak valid';
        
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Baru saja';
        if (diffMins < 60) return `${diffMins} menit lalu`;
        if (diffHours < 24) return `${diffHours} jam lalu`;
        if (diffDays < 7) return `${diffDays} hari lalu`;
        
        return postDate.toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'short', 
            year: postDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
        });
    }

    // Validate post data
    static validatePost(postData) {
        const errors = [];
        
        if (!postData.title || postData.title.trim().length === 0) {
            errors.push('Judul tidak boleh kosong');
        }
        
        if (!postData.content || postData.content.trim().length === 0) {
            errors.push('Isi postingan tidak boleh kosong');
        }
        
        if (postData.title && postData.title.length > 200) {
            errors.push('Judul terlalu panjang (maksimal 200 karakter)');
        }
        
        if (postData.content && postData.content.length > 5000) {
            errors.push('Isi postingan terlalu panjang (maksimal 5000 karakter)');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Validate comment data
    static validateComment(commentData) {
        const errors = [];
        
        if (!commentData.text || commentData.text.trim().length === 0) {
            errors.push('Komentar tidak boleh kosong');
        }
        
        if (commentData.text && commentData.text.length > 1000) {
            errors.push('Komentar terlalu panjang (maksimal 1000 karakter)');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Generate random color for user avatar
    static generateAvatarColor(userId) {
        const colors = [
            'from-blue-400 to-cyan-500',
            'from-purple-400 to-pink-500',
            'from-green-400 to-teal-500',
            'from-yellow-400 to-orange-500',
            'from-red-400 to-pink-500',
            'from-indigo-400 to-purple-500',
            'from-emerald-400 to-cyan-500',
            'from-orange-400 to-red-500'
        ];
        
        // Use userId to generate consistent color
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }

    // Debounce function for search
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Check if user is online
    static isOnline() {
        return navigator.onLine;
    }

    // Get device info for analytics
    static getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenWidth: screen.width,
            screenHeight: screen.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            isOnline: this.isOnline(),
            timestamp: new Date().toISOString()
        };
    }

    // Local storage helpers
    static setLocalData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    }

    static getLocalData(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Failed to read from localStorage:', error);
            return defaultValue;
        }
    }

    // Show notification with auto-dismiss
    static showNotification(message, type = 'info', duration = 3000) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.forum-notification');
        existingNotifications.forEach(notif => notif.remove());

        const notification = document.createElement('div');
        notification.className = `forum-notification fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-black' :
            'bg-blue-500 text-white'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="flex-1">${message}</span>
                <button class="ml-2 text-current opacity-70 hover:opacity-100" onclick="this.parentElement.parentElement.remove()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-dismiss
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
        
        return notification;
    }

    // Error logging
    static logError(error, context = '') {
        const errorData = {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        console.error('Forum Error:', errorData);
        
        // Store error in localStorage for debugging
        const errors = this.getLocalData('forum_errors', []);
        errors.push(errorData);
        
        // Keep only last 50 errors
        if (errors.length > 50) {
            errors.splice(0, errors.length - 50);
        }
        
        this.setLocalData('forum_errors', errors);
        
        return errorData;
    }

    // Performance monitoring
    static measurePerformance(name, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        
        console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
        
        return result;
    }

    // Async performance monitoring
    static async measureAsyncPerformance(name, fn) {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        
        console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
        
        return result;
    }

    // Rate limiting helper
    static createRateLimiter(maxCalls, timeWindow) {
        const calls = [];
        
        return function() {
            const now = Date.now();
            
            // Remove old calls outside time window
            while (calls.length > 0 && calls[0] <= now - timeWindow) {
                calls.shift();
            }
            
            if (calls.length >= maxCalls) {
                return false; // Rate limit exceeded
            }
            
            calls.push(now);
            return true; // Call allowed
        };
    }

    // Generate unique ID
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Copy text to clipboard
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Teks berhasil disalin!', 'success', 2000);
            return true;
        } catch (error) {
            console.error('Failed to copy text:', error);
            this.showNotification('Gagal menyalin teks', 'error', 2000);
            return false;
        }
    }

    // Format file size
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Check if element is in viewport
    static isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
}

// Export default
export default ForumUtils;
