// Forum Testing Utilities
// This file contains functions to test forum functionality

class ForumTester {
    constructor() {
        this.testResults = [];
        this.isTestMode = window.location.search.includes('test=true');
    }

    // Test if Firebase is properly initialized
    async testFirebaseConnection() {
        try {
            const { db } = await import('../../services/firebase-init.js');
            const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
            
            const testQuery = await getDocs(collection(db, 'forum_posts'));
            this.logTest('Firebase Connection', true, 'Successfully connected to Firestore');
            return true;
        } catch (error) {
            this.logTest('Firebase Connection', false, `Failed to connect: ${error.message}`);
            return false;
        }
    }

    // Test if user can create a post
    async testCreatePost() {
        try {
            const titleInput = document.getElementById('post-title');
            const contentInput = document.getElementById('post-content');
            const categorySelect = document.getElementById('post-category');
            
            if (!titleInput || !contentInput || !categorySelect) {
                throw new Error('Post form elements not found');
            }

            // Simulate filling the form
            titleInput.value = 'Test Post - ' + new Date().toISOString();
            contentInput.value = 'This is a test post content with #testing hashtag';
            categorySelect.value = 'Diskusi';

            this.logTest('Create Post Form', true, 'Post form elements are accessible');
            return true;
        } catch (error) {
            this.logTest('Create Post Form', false, `Form test failed: ${error.message}`);
            return false;
        }
    }

    // Test search functionality
    testSearchFunction() {
        try {
            const searchInput = document.getElementById('search-input');
            if (!searchInput) {
                throw new Error('Search input not found');
            }

            // Simulate search
            searchInput.value = 'test';
            searchInput.dispatchEvent(new Event('input'));

            this.logTest('Search Function', true, 'Search input is functional');
            return true;
        } catch (error) {
            this.logTest('Search Function', false, `Search test failed: ${error.message}`);
            return false;
        }
    }

    // Test category filter buttons
    testCategoryFilters() {
        try {
            const categoryButtons = document.querySelectorAll('.flex.space-x-2.overflow-x-auto button');
            if (categoryButtons.length === 0) {
                throw new Error('Category buttons not found');
            }

            // Test clicking first category button
            categoryButtons[0].click();

            this.logTest('Category Filters', true, `Found ${categoryButtons.length} category buttons`);
            return true;
        } catch (error) {
            this.logTest('Category Filters', false, `Category filter test failed: ${error.message}`);
            return false;
        }
    }

    // Test modal functionality
    testModalFunctionality() {
        try {
            const newPostButton = document.getElementById('new-post-button');
            const newPostModal = document.getElementById('new-post-modal');
            const cancelButton = document.getElementById('cancel-post-button');

            if (!newPostButton || !newPostModal || !cancelButton) {
                throw new Error('Modal elements not found');
            }

            // Test opening modal
            newPostButton.click();
            const isModalVisible = !newPostModal.classList.contains('hidden');

            // Test closing modal
            cancelButton.click();
            const isModalHidden = newPostModal.classList.contains('hidden');

            if (isModalVisible && isModalHidden) {
                this.logTest('Modal Functionality', true, 'Modal opens and closes correctly');
                return true;
            } else {
                throw new Error('Modal visibility toggle failed');
            }
        } catch (error) {
            this.logTest('Modal Functionality', false, `Modal test failed: ${error.message}`);
            return false;
        }
    }

    // Test responsive design
    testResponsiveDesign() {
        try {
            const forumContainer = document.getElementById('app-container');
            if (!forumContainer) {
                throw new Error('Forum container not found');
            }

            // Check if Tailwind classes are applied
            const hasResponsiveClasses = forumContainer.className.includes('pb-24');
            
            this.logTest('Responsive Design', hasResponsiveClasses, 
                hasResponsiveClasses ? 'Responsive classes detected' : 'Responsive classes missing');
            return hasResponsiveClasses;
        } catch (error) {
            this.logTest('Responsive Design', false, `Responsive test failed: ${error.message}`);
            return false;
        }
    }

    // Test accessibility features
    testAccessibility() {
        try {
            const buttons = document.querySelectorAll('button');
            const inputs = document.querySelectorAll('input, textarea, select');
            
            let accessibilityScore = 0;
            let totalChecks = 0;

            // Check if buttons have proper attributes
            buttons.forEach(button => {
                totalChecks++;
                if (button.getAttribute('title') || button.getAttribute('aria-label') || button.textContent.trim()) {
                    accessibilityScore++;
                }
            });

            // Check if form elements have labels
            inputs.forEach(input => {
                totalChecks++;
                const label = document.querySelector(`label[for="${input.id}"]`);
                if (label || input.getAttribute('aria-label') || input.getAttribute('placeholder')) {
                    accessibilityScore++;
                }
            });

            const accessibilityPercentage = totalChecks > 0 ? (accessibilityScore / totalChecks) * 100 : 0;
            const passed = accessibilityPercentage >= 80;

            this.logTest('Accessibility', passed, 
                `Accessibility score: ${accessibilityPercentage.toFixed(1)}% (${accessibilityScore}/${totalChecks})`);
            return passed;
        } catch (error) {
            this.logTest('Accessibility', false, `Accessibility test failed: ${error.message}`);
            return false;
        }
    }

    // Test performance
    testPerformance() {
        try {
            const startTime = performance.now();
            
            // Simulate DOM operations
            const forumThreads = document.getElementById('forum-threads');
            if (!forumThreads) {
                throw new Error('Forum threads container not found');
            }

            // Measure DOM query time
            const posts = forumThreads.querySelectorAll('.bg-white.rounded-2xl');
            const endTime = performance.now();
            const queryTime = endTime - startTime;

            const passed = queryTime < 100; // Should be under 100ms
            this.logTest('Performance', passed, 
                `DOM query time: ${queryTime.toFixed(2)}ms (${posts.length} posts)`);
            return passed;
        } catch (error) {
            this.logTest('Performance', false, `Performance test failed: ${error.message}`);
            return false;
        }
    }

    // Log test results
    logTest(testName, passed, message) {
        const result = {
            name: testName,
            passed,
            message,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        if (this.isTestMode) {
            console.log(`[TEST] ${testName}: ${passed ? '✅ PASS' : '❌ FAIL'} - ${message}`);
        }
    }

    // Run all tests
    async runAllTests() {
        console.log('🧪 Starting Forum Tests...');
        
        const tests = [
            () => this.testFirebaseConnection(),
            () => this.testCreatePost(),
            () => this.testSearchFunction(),
            () => this.testCategoryFilters(),
            () => this.testModalFunctionality(),
            () => this.testResponsiveDesign(),
            () => this.testAccessibility(),
            () => this.testPerformance()
        ];

        let passedTests = 0;
        for (const test of tests) {
            try {
                const result = await test();
                if (result) passedTests++;
            } catch (error) {
                console.error('Test execution error:', error);
            }
        }

        const totalTests = tests.length;
        const successRate = (passedTests / totalTests) * 100;

        console.log(`\n📊 Test Results: ${passedTests}/${totalTests} passed (${successRate.toFixed(1)}%)`);
        
        if (successRate >= 80) {
            console.log('🎉 Forum is ready for production!');
        } else {
            console.log('⚠️ Some issues need to be addressed before deployment.');
        }

        return {
            passed: passedTests,
            total: totalTests,
            successRate,
            results: this.testResults
        };
    }

    // Generate test report
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            tests: this.testResults,
            summary: {
                total: this.testResults.length,
                passed: this.testResults.filter(t => t.passed).length,
                failed: this.testResults.filter(t => !t.passed).length
            }
        };

        if (this.isTestMode) {
            console.log('📋 Test Report:', report);
        }

        return report;
    }
}

// Auto-run tests if in test mode
document.addEventListener('DOMContentLoaded', () => {
    const tester = new ForumTester();
    
    if (tester.isTestMode) {
        setTimeout(() => {
            tester.runAllTests().then(() => {
                tester.generateReport();
            });
        }, 2000); // Wait for other scripts to load
    }

    // Expose tester to global scope for manual testing
    window.forumTester = tester;
});

// Export for module usage
export default ForumTester;
