// ==========================================
// EXAM MASTER ADMIN - MAIN ENTRY POINT
// ==========================================

import { supabase } from './supabaseClient.js';
import { showToast } from './utils.js';
import { 
    showLoading, 
    showSection, 
    updateUserInfo, 
    updateDatabaseStatus 
} from './admin-ui.js';
import { adminLogin, logout, checkDatabaseConnection } from './admin-auth.js';
import { loadExams, addNewExam, toggleExamStatus, deleteExam } from './admin-exams.js';
import { 
    loadNotifications, 
    sendNotification, 
    deleteNotification, 
    viewNotification, 
    previewImage, 
    removeImage,
    previewPDF,
    removePDF,
    viewFullImage,
    closeFullImage,
    viewPDFInfo,
    closePDFInfo
} from './admin-notifications.js';
import { 
    loadChatData, 
    deleteChatMessage, 
    banUser, 
    refreshChat, 
    viewChatMessage 
} from './admin-chat.js';
import { 
    loadEffectsStatus, 
    toggleEffect, 
    toggleTheme, 
    selectTheme, 
    testSnowEffect, 
    testConfettiEffect, 
    stopAllEffects, 
    backupDatabase,
    saveSettings
} from './admin-effects.js';
import { loadDashboardStats, loadRecentActivity } from './admin-dashboard.js';

// ==========================================
// INITIALIZATION
// ==========================================

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Admin Panel Initializing...');
    
    try {
        // Check for existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('Session error:', sessionError);
            showToast('Session error. Please login again.', 'error');
            showLoginScreen();
            return;
        }
        
        if (session) {
            currentUser = session.user;
            console.log('✅ User logged in:', currentUser.email);
            
            // Update UI
            showDashboardScreen();
            updateUserInfo(currentUser);
            
            // Load all data
            await loadAllData();
            
            // Update database status
            await checkDatabaseConnection();
            
            showToast('Welcome back, ' + currentUser.email, 'success');
        } else {
            console.log('No session found, showing login form');
            showLoginScreen();
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('System initialization failed', 'error');
        showLoginScreen();
    } finally {
        // Hide loading overlay
        setTimeout(() => {
            const loader = document.getElementById('loadingOverlay');
            if (loader) loader.style.display = 'none';
        }, 1000);
    }
});

// Show login screen
function showLoginScreen() {
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    
    if (loginSection) loginSection.style.display = 'block';
    if (dashboardSection) dashboardSection.style.display = 'none';
}

// Show dashboard screen
function showDashboardScreen() {
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    
    if (loginSection) loginSection.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = 'block';
}

async function loadAllData() {
    showLoading(true);
    
    try {
        // Load core data first
        await Promise.all([
            loadExams(),
            loadNotifications(),
            loadChatData(),
            loadEffectsStatus()
        ]);
        
        // Then load stats and activity which depend on the above
        await Promise.all([
            loadDashboardStats(),
            loadRecentActivity()
        ]);
        
        console.log('✅ All data loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Failed to load some data', 'warning');
    } finally {
        showLoading(false);
    }
}

// ==========================================
// EVENT LISTENERS
// ==========================================

// Handle login success event
window.addEventListener('admin:logged_in', async () => {
    await loadAllData();
});

// Handle data changes (reload stats/activity)
window.addEventListener('admin:data_changed', async () => {
    await loadDashboardStats();
    await loadRecentActivity();
});

// Time Update
function updateTime() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    
    const dateEl = document.getElementById('currentDate');
    const timeEl = document.getElementById('currentTime');
    
    if (dateEl) dateEl.textContent = dateStr;
    if (timeEl) timeEl.textContent = timeStr;
}

updateTime();
setInterval(updateTime, 1000);

// ==========================================
// EXPORT TO WINDOW (for HTML event handlers)
// ==========================================

window.adminLogin = adminLogin;
window.logout = logout;
window.showSection = showSection;

// Exams
window.addNewExam = addNewExam;
window.toggleExamStatus = toggleExamStatus;
window.deleteExam = deleteExam;

// Notifications
window.sendNotification = sendNotification;
window.deleteNotification = deleteNotification;
window.viewNotification = viewNotification;
window.previewImage = previewImage;
window.removeImage = removeImage;
window.previewPDF = previewPDF;
window.removePDF = removePDF;
window.viewFullImage = viewFullImage;
window.closeFullImage = closeFullImage;
window.viewPDFInfo = viewPDFInfo;
window.closePDFInfo = closePDFInfo;

// Chat
window.deleteChatMessage = deleteChatMessage;
window.banUser = banUser;
window.viewChatMessage = viewChatMessage;
window.refreshChat = refreshChat;

// Effects & Settings
window.toggleEffect = toggleEffect;
window.toggleTheme = toggleTheme;
window.selectTheme = selectTheme;
window.testSnowEffect = testSnowEffect;
window.testConfettiEffect = testConfettiEffect;
window.stopAllEffects = stopAllEffects;
window.backupDatabase = backupDatabase;
window.saveSettings = saveSettings;

console.log('✅ Admin panel JavaScript loaded successfully! 🚀');