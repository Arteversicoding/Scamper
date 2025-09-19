import { AuthService } from './auth-service.js';

/**
 * Admin Setup Script
 * This script creates admin users in Firebase Authentication
 * Run this script once to initialize admin accounts
 */

class AdminSetup {
    constructor() {
        this.authService = new AuthService();
        this.adminAccounts = [
            {
                email: 'admin@mi.com',
                password: 'Admin123!',
                displayName: 'Super Admin'
            },
            {
                email: 'admin@moralintelligence.com', 
                password: 'MoralAdmin2024!',
                displayName: 'Moral Intelligence Admin'
            },
            {
                email: 'superadmin@mi.com',
                password: 'SuperAdmin123!',
                displayName: 'System Administrator'
            }
        ];
    }

    async createAdminUsers() {
        console.log('🚀 Starting admin user creation process...');
        
        for (const admin of this.adminAccounts) {
            try {
                console.log(`📧 Creating admin user: ${admin.email}`);
                await this.authService.ensureAdminUserExists(admin.email, admin.password);
                console.log(`✅ Admin user created/verified: ${admin.email}`);
            } catch (error) {
                console.error(`❌ Error creating admin user ${admin.email}:`, error.message);
            }
        }
        
        console.log('🎉 Admin setup process completed!');
        console.log('\n📋 Admin Credentials:');
        this.adminAccounts.forEach(admin => {
            console.log(`Email: ${admin.email} | Password: ${admin.password}`);
        });
    }

    // Method to test admin login
    async testAdminLogin(email, password) {
        try {
            console.log(`🔐 Testing admin login for: ${email}`);
            const result = await this.authService.loginAdmin(email, password);
            console.log(`✅ Admin login successful for: ${email}`);
            console.log('User data:', result.user);
            await this.authService.logout();
            return true;
        } catch (error) {
            console.error(`❌ Admin login failed for ${email}:`, error.message);
            return false;
        }
    }

    // Method to test all admin logins
    async testAllAdminLogins() {
        console.log('🧪 Testing all admin logins...');
        
        for (const admin of this.adminAccounts) {
            await this.testAdminLogin(admin.email, admin.password);
        }
        
        console.log('🏁 Admin login testing completed!');
    }
}

// Export for use in other files
export { AdminSetup };

// Auto-run if this script is loaded directly
if (typeof window !== 'undefined') {
    window.AdminSetup = AdminSetup;
    
    // Add setup button to page if it doesn't exist
    if (!document.getElementById('adminSetupBtn')) {
        const setupBtn = document.createElement('button');
        setupBtn.id = 'adminSetupBtn';
        setupBtn.textContent = '🔧 Setup Admin Users';
        setupBtn.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors z-50';
        setupBtn.onclick = async () => {
            const setup = new AdminSetup();
            await setup.createAdminUsers();
            alert('Admin setup completed! Check console for details.');
        };
        document.body.appendChild(setupBtn);
    }
}
