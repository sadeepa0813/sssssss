// ==========================================
// EXAM MASTER SL - MAIN ENTRY POINT
// ==========================================

import { showToast, injectGlobalStyles } from './utils.js';
import { initializeEffects, startEffectsFromSettings, testSnowEffect, testConfettiEffect, stopAllEffects } from './effects.js';
import { loadChat, sendComment, loadMoreMessages } from './chat.js';
import { checkNotifications, openNotifModal, closeNotifModal } from './notifications.js';
import { loadExams } from './exams.js';
import { checkDailyMotivation } from './motivation.js';

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Exam Master SL - Initializing...');
    
    // Inject global styles
    injectGlobalStyles();
    
    // Hide loading overlay after 1.5 seconds
    setTimeout(() => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }, 1500);
    
    // Initialize all systems
    try {
        await initializeAllSystems();
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('System initialization failed. Please refresh the page.', 'error');
    }
});

async function initializeAllSystems() {
    // 1. Initialize effects canvas first
    await initializeEffects();
    
    // 2. Load exams data
    await loadExams();
    
    // 3. Check for notifications
    await checkNotifications();
    
    // 4. Load chat system
    await loadChat();
    
    // 5. Check for daily motivational message
    checkDailyMotivation();
    
    // 6. Start effects based on settings
    await startEffectsFromSettings();
    
    console.log('All systems initialized successfully!');
}

// ==========================================
// EVENT LISTENERS & GLOBAL BINDINGS
// ==========================================

// Bind functions to window for HTML event handlers
window.openNotifModal = openNotifModal;
window.closeNotifModal = closeNotifModal;
window.sendComment = sendComment;
window.loadMoreMessages = loadMoreMessages;
window.testSnowEffect = testSnowEffect;
window.testConfettiEffect = testConfettiEffect;
window.stopAllEffects = stopAllEffects;
window.installApp = installApp;

// WhatsApp Share Function
window.shareToWhatsApp = function() {
    const text = encodeURIComponent("Check out Exam Master SL! The best place to track exams and study with a community. 🚀📚\n\nVisit now: " + window.location.href);
    window.open(`https://wa.me/?text=${text}`, '_blank');
};

// Modal close on outside click
document.addEventListener('click', function(e) {
    const notifModal = document.getElementById('notifModal');
    if (notifModal && e.target === notifModal) {
        closeNotifModal();
    }
});

// Keypress listeners
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement.id === 'chatMessage') {
            sendComment();
        } else if (activeElement.id === 'chatName') {
            const msgInput = document.getElementById('chatMessage');
            if (msgInput) msgInput.focus();
        }
    }
});

// Notification icon click
const notifIcon = document.getElementById('notificationIcon');
if (notifIcon) {
    notifIcon.addEventListener('click', openNotifModal);
}

// ==========================================
// PWA INSTALLATION
// ==========================================
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('installButton');
    if (installBtn) installBtn.style.display = 'flex';
});

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                const installBtn = document.getElementById('installButton');
                if (installBtn) installBtn.style.display = 'none';
            }
            deferredPrompt = null;
        });
    }
}

console.log('Exam Master SL - App.js loaded successfully! 🚀');