// src/services/AuthService.js
import { getAuth, onAuthStateChanged, signInWithPhoneNumber, signOut, PhoneAuthProvider } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AuthService {
    constructor() {
        console.log('AuthService CONSTRUCTOR: Initializing...');
        this.user = null;
        this.userProfile = null;
        this.authStateListeners = [];
        this.isInitializing = true;
        this.hasProfileChecked = false;

        try {
            // Initialize Firebase services
            this.auth = getAuth();
            this.db = getFirestore();
            console.log('AuthService CONSTRUCTOR: Firebase services obtained.');

            // Set initial user state from auth cache
            this.user = this.auth.currentUser;
            console.log('AuthService CONSTRUCTOR: Initial user state:', this.user ? this.user.uid : 'null');

            // If user exists, try to load profile immediately
            if (this.user) {
                console.log('AuthService CONSTRUCTOR: Loading initial profile for user:', this.user.uid);
                this.loadUserProfile(this.user.uid)
                    .finally(() => {
                        this.isInitializing = false;
                        this.notifyListeners();
                    });
            } else {
                this.isInitializing = false;
            }

            // Listen for authentication state changes
            this.unsubscribeAuth = onAuthStateChanged(this.auth, this.onAuthStateChanged.bind(this));
            console.log('AuthService CONSTRUCTOR: Firebase onAuthStateChanged listener attached.');
        } catch (error) {
            console.error('AuthService CONSTRUCTOR CRITICAL ERROR:', error);
            this.isInitializing = false;
        }
    }

    // Notify all listeners with current state
    notifyListeners() {
        if (this.isInitializing) {
            console.log('AuthService.notifyListeners: Skipping during initialization');
            return;
        }

        console.log('AuthService.notifyListeners: Notifying', this.authStateListeners.length,
                   'listeners. User:', this.user ? this.user.uid : 'null',
                   'Profile:', this.userProfile ? 'exists' : 'null');

        this.authStateListeners.forEach(listener => {
            try {
                listener(this.user, this.userProfile);
            } catch (listenerError) {
                console.error('AuthService.notifyListeners: Error in listener:', listenerError);
            }
        });
    }

    // Add authentication state listener
    addAuthStateListener(listener) {
        console.log('AuthService.addAuthStateListener: Adding new listener');
        if (typeof listener !== 'function') {
            console.error('AuthService.addAuthStateListener: Provided listener is not a function!');
            return () => {};
        }

        this.authStateListeners.push(listener);
        console.log('AuthService.addAuthStateListener: Total listeners now:', this.authStateListeners.length);

        // Immediately notify the new listener with current state if initialization is complete
        if (!this.isInitializing) {
            console.log('AuthService.addAuthStateListener: Immediately notifying new listener');
            try {
                listener(this.user, this.userProfile);
            } catch (error) {
                console.error("AuthService.addAuthStateListener: Error notifying new listener:", error);
            }
        }

        // Return unsubscribe function
        return () => {
            const index = this.authStateListeners.indexOf(listener);
            if (index > -1) {
                this.authStateListeners.splice(index, 1);
                console.log('AuthService.addAuthStateListener: Listener removed. Total listeners now:', this.authStateListeners.length);
            }
        };
    }

    // Handle auth state changes
    async onAuthStateChanged(user) {
        console.log('AuthService.onAuthStateChanged: Triggered with user:', user ? user.uid : 'null');

        this.user = user;
        let loadedProfile = null;

        if (user) {
            try {
                console.log('AuthService.onAuthStateChanged: Loading profile for user:', user.uid);
                loadedProfile = await this.loadUserProfile(user.uid);
            } catch (error) {
                console.error('AuthService.onAuthStateChanged: Error loading profile:', error);
            }
        } else {
            this.userProfile = null;
        }

        // Only notify listeners if we're not in initialization phase
        if (!this.isInitializing) {
            this.notifyListeners();
        }
    }

  // Add method to check if user has profile
  async hasUserProfile() {
    if (this.hasProfileChecked && this.userProfile) {
      return true;
    }

    if (!this.user) {
      return false;
    }

    try {
      const userDoc = await getDoc(doc(this.db, 'users', this.user.uid));
      this.hasProfileChecked = true;
      return userDoc.exists();
    } catch (error) {
      console.error('Error checking user profile:', error);
      return false;
    }
  }

    // Load user profile from Firestore
    async loadUserProfile(uid) {
        try {
            console.log('AuthService.loadUserProfile: Loading profile for:', uid);
            const userDoc = await getDoc(doc(this.db, 'users', uid));

            if (userDoc.exists()) {
                this.userProfile = userDoc.data();
                this.hasProfileChecked = true;
                console.log('AuthService.loadUserProfile: Profile loaded successfully');
                return this.userProfile;
            } else {
                console.log('AuthService.loadUserProfile: Profile does not exist for:', uid);
                this.userProfile = null;
                this.hasProfileChecked = true;
                return null;
            }
        } catch (error) {
            console.error('AuthService.loadUserProfile: Error loading profile:', error);
            this.userProfile = null;
            throw error;
        }
    }

    // Send OTP to phone number
    async sendOTP(phoneNumber) {
        try {
            const formattedPhone = this.formatPhoneNumber(phoneNumber);
            console.log('AuthService.sendOTP: Sending OTP to', formattedPhone);
            const confirmation = await signInWithPhoneNumber(this.auth, formattedPhone);
            return { success: true, confirmation, verificationId: confirmation.verificationId };
        } catch (error) {
            console.error('AuthService.sendOTP: Error sending OTP:', error);
            return { success: false, error: this.getErrorMessage(error) };
        }
    }

    // Verify OTP and complete authentication
    async verifyOTP(verificationId, otp) {
        try {
            console.log('AuthService.verifyOTP: Verifying OTP with verificationId:', verificationId);

            // Create credential using verificationId and OTP
            const credential = PhoneAuthProvider.credential(verificationId, otp);

            // Sign in with the credential
            const userCredential = await this.auth.signInWithCredential(credential);
            const user = userCredential.user;
            console.log('AuthService.verifyOTP: User signed in:', user.uid);

            // Check if user profile exists
            const userDoc = await getDoc(doc(this.db, 'users', user.uid));

            if (!userDoc.exists()) {
                console.log('AuthService.verifyOTP: New user detected');
                return {
                    success: true,
                    user,
                    isNewUser: true
                };
            } else {
                console.log('AuthService.verifyOTP: Existing user found');
                this.userProfile = userDoc.data();
                return {
                    success: true,
                    user,
                    userProfile: this.userProfile,
                    isNewUser: false
                };
            }
        } catch (error) {
            console.error('AuthService.verifyOTP: Error verifying OTP:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    // Create user profile after successful authentication
    async createUserProfile(userData) {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                throw new Error('No authenticated user found');
            }

            console.log('AuthService.createUserProfile: Creating profile for:', user.uid);

            const userProfileData = {
                uid: user.uid,
                phoneNumber: user.phoneNumber,
                ...userData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await setDoc(doc(this.db, 'users', user.uid), userProfileData);
            this.userProfile = userProfileData;

            console.log('AuthService.createUserProfile: Profile created successfully');

            // Notify listeners about the new profile
            this.notifyListeners();

            return { success: true, userProfile: this.userProfile };
        } catch (error) {
            console.error('AuthService.createUserProfile: Error creating profile:', error);
            return { success: false, error: this.getErrorMessage(error) };
        }
    }

    // Update user profile
    async updateUserProfile(updates) {
        try {
            const user = this.auth.currentUser;
            if (!user) {
                throw new Error('No authenticated user found');
            }

            console.log('AuthService.updateUserProfile: Updating profile for:', user.uid);

            const updatedData = {
                ...updates,
                updatedAt: serverTimestamp()
            };

            await updateDoc(doc(this.db, 'users', user.uid), updatedData);
            this.userProfile = { ...this.userProfile, ...updatedData };

            console.log('AuthService.updateUserProfile: Profile updated successfully');

            // Notify listeners about the updated profile
            this.notifyListeners();

            return { success: true, userProfile: this.userProfile };
        } catch (error) {
            console.error('AuthService.updateUserProfile: Error updating profile:', error);
            return { success: false, error: this.getErrorMessage(error) };
        }
    }

    // Sign out user
    async signOut() {
        try {
            console.log('AuthService.signOut: Signing out user');
            await signOut(this.auth);
            this.userProfile = null;
            console.log('AuthService.signOut: User signed out successfully');
            return { success: true };
        } catch (error) {
            console.error('AuthService.signOut: Error signing out:', error);
            return { success: false, error: this.getErrorMessage(error) };
        }
    }

    // Get current user
    getCurrentUser() {
        return this.user;
    }

    // Get current user profile
    getCurrentUserProfile() {
        return this.userProfile;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.user;
    }

    // Get user role
    getUserRole() {
        return this.userProfile ? this.userProfile.role : null;
    }

    // Format phone number to international format
    formatPhoneNumber(phoneNumber) {
      // Remove any non-digit characters
      const cleaned = phoneNumber.replace(/\D/g, '');

      console.log('Formatting phone number:', cleaned);

      // Handle different input formats
      if (cleaned.startsWith('0') && cleaned.length === 10) {
        // Local format: 0712345678 → +255712345678
        return '+255' + cleaned.substring(1);
      } else if (cleaned.startsWith('255') && cleaned.length === 12) {
        // National format: 255712345678 → +255712345678
        return '+' + cleaned;
      } else if (cleaned.startsWith('+255') && cleaned.length === 13) {
        // Already in international format
        return cleaned;
      } else if (cleaned.length === 9) {
        // 9-digit number without prefix: 712345678 → +255712345678
        return '+255' + cleaned;
      } else {
        // Invalid format, but try to handle it
        console.warn('Unexpected phone number format:', phoneNumber);
        return '+255' + cleaned.slice(-9); // Take last 9 digits
      }
    }

    // Get user-friendly error message
    getErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-phone-number':
                return 'Invalid phone number format';
            case 'auth/invalid-verification-code':
                return 'Invalid verification code';
            case 'auth/code-expired':
                return 'Verification code has expired';
            case 'auth/too-many-requests':
                return 'Too many requests. Please try again later';
            case 'auth/network-request-failed':
                return 'Network error. Please check your connection';
            default:
                return error.message || 'An unexpected error occurred';
        }
    }

    // Cleanup on instance destruction
    destroy() {
        console.log('AuthService.destroy: Cleaning up...');
        this.unsubscribeAuth();
    }
}

// Create and export singleton instance
const authService = new AuthService();
export default authService;