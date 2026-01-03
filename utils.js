// Utility Functions

// Sanitize HTML to prevent XSS
export function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Show Toast Notification
export function showToast(message, type = 'success') {
    console.log(`Toast: ${message} (${type})`);
    
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.custom-toast');
    existingToasts.forEach(toast => {
        if (toast.parentElement) {
            toast.parentElement.removeChild(toast);
        }
    });
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    
    // Set icon based on type
    let icon = 'info-circle';
    let borderColor = '#4361ee';
    
    switch(type) {
        case 'success':
            icon = 'check-circle';
            borderColor = '#4cc9f0';
            break;
        case 'error':
            icon = 'exclamation-circle';
            borderColor = '#f72585';
            break;
        case 'warning':
            icon = 'exclamation-triangle';
            borderColor = '#f8961e';
            break;
    }
    
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1e293b;
        color: #f8fafc;
        padding: 15px 20px;
        border-radius: 12px;
        border-left: 4px solid ${borderColor};
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 1001;
        transform: translateX(150%);
        transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        max-width: 350px;
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(150%)';
        setTimeout(() => {
            if (toast.parentElement) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Get user IP address
export async function getIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Failed to get IP:', error);
        return 'unknown';
    }
}

// Inject Global Styles (Animations)
export function injectGlobalStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
    `;
    document.head.appendChild(style);
}
