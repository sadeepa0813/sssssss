import { supabase } from './supabaseClient.js';
import { showToast } from './utils.js';
import { showLoading, updateUserInfo, updateDatabaseStatus } from './admin-ui.js';

// Rate limiting
export const rateLimiter = {
    requests: {},
    check: function(key, limit = 10, window = 60000) {
        const now = Date.now();
        if (!this.requests[key]) {
            this.requests[key] = [];
        }
        
        // Remove old requests
        this.requests[key] = this.requests[key].filter(time => now - time < window);
        
        if (this.requests[key].length >= limit) {
            return false;
        }
        
        this.requests[key].push(now);
        return true;
    }
};

export async function adminLogin() {
    const email = document.getElementById('adminEmail')?.value.trim();
    const password = document.getElementById('adminPassword')?.value.trim();
    
    // Input validation
    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    // Rate limiting
    if (!rateLimiter.check('login', 5, 300000)) {
        showToast('Too many login attempts. Please try again later.', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // Sign in with email and password
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            console.error('Login error:', error);
            
            if (error.message === 'Invalid login credentials') {
                showToast('Invalid email or password ❌', 'error');
            } else if (error.message.includes('Email not confirmed')) {
                showToast('Please verify your email address first 📧', 'warning');
            } else {
                showToast('Login failed: ' + error.message, 'error');
            }
            return;
        }
        
        if (!data.user) {
            showToast('Login failed: No user data returned', 'error');
            return;
        }
        
        console.log('✅ Login successful:', data.user.email);
        
        // Update UI
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'block';
        updateUserInfo(data.user);
        
        // Check database connection
        await checkDatabaseConnection();
        
        showToast('Login successful! Welcome back 🎉', 'success');
        
        // Clear login form
        document.getElementById('adminEmail').value = '';
        document.getElementById('adminPassword').value = '';
        
        // Trigger data load (this will be handled by the main script listener, 
        // or we can dispatch an event)
        window.dispatchEvent(new CustomEvent('admin:logged_in'));
        
    } catch (error) {
        console.error('Login error:', error);
        showToast('An unexpected error occurred: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

export async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('Sign out error:', error);
            showToast('Logout failed: ' + error.message, 'error');
            return;
        }
        
        // Reset UI
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('dashboardSection').style.display = 'none';
        
        // Clear forms
        const emailField = document.getElementById('adminEmail');
        const passwordField = document.getElementById('adminPassword');
        if (emailField) emailField.value = '';
        if (passwordField) passwordField.value = '';
        
        showToast('Logged out successfully 👋', 'success');
        
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout failed', 'error');
    }
}

export async function checkDatabaseConnection() {
    try {
        const { error } = await supabase
            .from('exams')
            .select('id')
            .limit(1);
        
        if (error) {
            console.error('Database connection failed:', error);
            updateDatabaseStatus(false);
            return false;
        }
        
        console.log('✅ Database connection successful');
        updateDatabaseStatus(true);
        return true;
    } catch (error) {
        console.error('Database check error:', error);
        updateDatabaseStatus(false);
        return false;
    }
}
