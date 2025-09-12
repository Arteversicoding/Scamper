import { 
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged,
    setPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { app, auth } from "./firebase-init.js";

const db = getFirestore(app);

export class AuthService {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.auth = auth;
        this.provider = new GoogleAuthProvider();
        
        // Define admin emails
        this.adminEmails = [
            'admin@mi.com',
            'admin@moralintelligence.com',
            'superadmin@mi.com',
            'admin@mersiflab.com'
        ];

        onAuthStateChanged(this.auth, async (user) => {
            if (user) {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    this.currentUser = {
                        uid: user.uid,
                        email: user.email,
                        displayName: userData.displayName || `${userData.firstName} ${userData.lastName}`,
                        photoURL: user.photoURL || userData.photoURL,
                        role: this.isAdminEmail(user.email) ? 'admin' : (userData.role || 'user')
                    };
                } else {
                    // This could be a user from Google Sign-In who doesn't have a doc yet
                    // Or a user that was created but their doc failed to be created
                    this.currentUser = {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || user.email,
                        photoURL: user.photoURL,
                        role: this.isAdminEmail(user.email) ? 'admin' : 'user'
                    };
                }
                this.isAuthenticated = true;
                
                // Save current user to localStorage for non-Firebase pages
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                
                // Don't redirect if user is on edit-profile page
                const currentPath = window.location.pathname;
                if (currentPath === '/login.html' || currentPath === '/register.html') {
                    window.location.href = '/index.html';
                }
            } else {
                this.currentUser = null;
                this.isAuthenticated = false;
                // Clear localStorage when user logs out
                localStorage.removeItem('currentUser');
            }
        });
    }

    // Check if email is admin email
    isAdminEmail(email) {
        return this.adminEmails.includes(email.toLowerCase());
    }

    async register(userData) {
        const { email, password, firstName, lastName, profession, institution } = userData;
        try {
            await setPersistence(this.auth, browserSessionPersistence);
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                firstName,
                lastName,
                email,
                profession,
                institution,
                role: 'user'
            });

            this.currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: `${firstName} ${lastName}`,
                role: 'user'
            };
            this.isAuthenticated = true;
            return { user: this.currentUser };
        } catch (error) {
            console.error("Registration error:", error);
            throw new Error(this.getFriendlyErrorMessage(error));
        }
    }

    async login(email, password) {
        try {
            await setPersistence(this.auth, browserSessionPersistence);
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;

            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                this.currentUser = {
                    uid: user.uid,
                    email: user.email,
                    displayName: `${userData.firstName} ${userData.lastName}`,
                    photoURL: user.photoURL, // or userData.photoURL if you store it
                    role: this.isAdminEmail(user.email) ? 'admin' : (userData.role || 'user')
                };
            } else {
                // Should not happen for a registered user, but as a fallback
                this.currentUser = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.email, // Fallback display name
                    photoURL: user.photoURL,
                    role: this.isAdminEmail(user.email) ? 'admin' : 'user'
                };
            }

            this.isAuthenticated = true;
            return { user: this.currentUser };
        } catch (error) {
            console.error("Login error:", error);
            throw new Error(this.getFriendlyErrorMessage(error));
        }
    }

    // Admin-only login: requires role 'admin' (via Firestore or admin email list)
    async loginAdmin(email, password) {
        try {
            await setPersistence(this.auth, browserSessionPersistence);
            
            // Try to sign in first
            let userCredential;
            try {
                userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            } catch (signInError) {
                // If user doesn't exist and it's an admin email, create it
                if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
                    if (this.isAdminEmail(email)) {
                        console.log(`Admin user ${email} not found. Creating...`);
                        await this.ensureAdminUserExists(email, password);
                        // Try to sign in again after creation
                        userCredential = await signInWithEmailAndPassword(this.auth, email, password);
                    } else {
                        throw signInError;
                    }
                } else {
                    throw signInError;
                }
            }
            
            const user = userCredential.user;

            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            const userData = userDoc.exists() ? userDoc.data() : {};

            const isAdmin = this.isAdminEmail(user.email) || (userData.role === 'admin');
            if (!isAdmin) {
                await signOut(this.auth);
                throw new Error('Akses admin ditolak. Akun ini bukan admin.');
            }

            this.currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : (user.displayName || user.email),
                photoURL: user.photoURL,
                role: 'admin'
            };
            this.isAuthenticated = true;
            return { user: this.currentUser };
        } catch (error) {
            console.error("Admin login error:", error);
            // Pass through specific message if we threw above
            if (typeof error?.message === 'string' && error.message.includes('Akses admin ditolak')) {
                throw error;
            }
            throw new Error(this.getFriendlyErrorMessage(error));
        }
    }

    async loginWithGoogle() {
        try {
            await setPersistence(this.auth, browserSessionPersistence);
            const result = await signInWithPopup(this.auth, this.provider);
            const user = result.user;

            // Check if user exists in Firestore
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            let userRole = 'user';

            if (!userDoc.exists()) {
                // New user, create a document in Firestore
                const [firstName, ...lastName] = user.displayName.split(' ');
                await setDoc(userDocRef, {
                    firstName: firstName || '',
                    lastName: lastName.join(' ') || '',
                    email: user.email,
                    photoURL: user.photoURL,
                    profession: '', // Not available from Google Sign-In
                    institution: '', // Not available from Google Sign-In
                    role: 'user'
                });
            } else {
                // Existing user, get their role
                userRole = userDoc.data().role || 'user';
            }

            this.currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: this.isAdminEmail(user.email) ? 'admin' : userRole
            };
            this.isAuthenticated = true;
            return { user: this.currentUser };
        } catch (error) {
            console.error("Google login error:", error);
            throw new Error(this.getFriendlyErrorMessage(error));
        }
    }

    async logout() {
        try {
            await signOut(this.auth);
            this.currentUser = null;
            this.isAuthenticated = false;
        } catch (error) {
            console.error("Logout error:", error);
            throw new Error("Gagal logout.");
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    waitForAuthInit() {
        return new Promise(resolve => {
            const unsubscribe = onAuthStateChanged(this.auth, user => {
                unsubscribe();
                if (user) {
                    // Return user with role information
                    resolve({
                        ...user,
                        role: this.isAdminEmail(user.email) ? 'admin' : 'user'
                    });
                } else {
                    resolve(null);
                }
            });
        });
    }

    async getFriendlyErrorMessage(error) {
        switch (error.code) {
            case 'auth/email-already-in-use':
                return 'Email ini sudah terdaftar. Silakan gunakan email lain atau login.';
            case 'auth/invalid-email':
                return 'Format email tidak valid.';
            case 'auth/weak-password':
                return 'Password terlalu lemah. Gunakan minimal 6 karakter.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential': // Added for newer Firebase versions
                return 'Email atau password salah.';
            case 'auth/unauthorized-domain':
                return 'Domain tidak diizinkan untuk otentikasi. Hubungi administrator.';
            default:
                return 'Terjadi kesalahan. Silakan coba lagi.';
        }
    }

    async ensureAdminUserExists(email, password) {
        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, "users", user.uid), {
                email: email,
                role: 'admin'
            });
            console.log('Admin user created successfully.');
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                console.log('Admin user already exists (email in use). Ensuring Firestore role is admin.');
                // If email is already in use, try to get the user by email (requires sign-in first)
                // Or, more simply, assume if we are trying to ensure admin, and email is in use,
                // we just need to ensure the Firestore doc has the admin role.
                // We can't get UID without signing in or having a user record.
                // A robust client-side solution for this specific case (ensuring role for existing user without knowing UID)
                // would involve querying Firestore by email, which is not ideal for security/performance.
                // For simplicity, we'll assume if this function is called, and user exists, we just update/set their Firestore doc.
                // This might create a new doc if it doesn't exist, or update if it does.
                // This is a simplified approach for a client-side seed.
                try {
                    // Attempt to sign in to get the UID
                    const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
                    const user = userCredential.user;
                    await setDoc(doc(db, "users", user.uid), { email: email, role: 'admin' }, { merge: true });
                    console.log('Admin user Firestore role updated/set to admin.');
                } catch (signInError) {
                    console.error('Could not sign in to update admin role:', signInError);
                    throw new Error(this.getFriendlyErrorMessage(signInError));
                }
            } else {
                console.error('Error ensuring admin user exists:', error);
                throw new Error(this.getFriendlyErrorMessage(error));
            }
        }
    }
}
