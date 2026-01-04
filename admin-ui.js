import { sanitizeHTML } from './utils.js';

export function showLoading(show) {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

export function showSection(section) {
    document.querySelectorAll('.content-section').forEach(el => {
        el.classList.remove('active');
    });
    
    document.querySelectorAll('.sidebar-menu li').forEach(el => {
        el.classList.remove('active');
    });
    
    const sectionEl = document.getElementById(`section-${section}`);
    if (sectionEl) {
        sectionEl.classList.add('active');
    }
    
    const menuItem = document.querySelector(`.sidebar-menu li[onclick*="${section}"]`);
    if (menuItem) {
        menuItem.classList.add('active');
    }
}

export function updateUserInfo(user) {
    if (user) {
        const adminName = document.getElementById('adminName');
        const adminEmail = document.getElementById('adminEmailDisplay');
        
        if (adminName) {
            adminName.textContent = user.email.split('@')[0] || 'Administrator';
        }
        if (adminEmail) {
            adminEmail.textContent = user.email;
        }
    }
}

export function updateDatabaseStatus(connected) {
    const dbStatus = document.getElementById('dbStatus');
    if (dbStatus) {
        if (connected) {
            dbStatus.style.backgroundColor = '#4cc9f0';
            dbStatus.classList.add('active');
        } else {
            dbStatus.style.backgroundColor = '#f72585';
            dbStatus.classList.remove('active');
        }
    }
}

export function formatTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export async function showConfirmation(title, message, confirmText = 'Confirm') {
    return new Promise((resolve) => {
        const modalHTML = `
            <div class="confirmation-modal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            ">
                <div style="
                    background: var(--bg-card);
                    padding: 2rem;
                    border-radius: 12px;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                    animation: slideUp 0.3s ease;
                ">
                    <h3 style="margin: 0 0 1rem 0; color: var(--text-primary);">
                        <i class="fas fa-exclamation-circle" style="color: var(--primary);"></i>
                        ${sanitizeHTML(title)}
                    </h3>
                    <p style="margin: 0 0 1.5rem 0; color: var(--text-secondary);">${sanitizeHTML(message)}</p>
                    <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                        <button id="confirmCancel" style="
                            padding: 0.75rem 1.5rem;
                            border: none;
                            border-radius: 8px;
                            background: var(--bg-dark);
                            color: var(--text-primary);
                            cursor: pointer;
                            font-weight: 500;
                            transition: all 0.3s ease;
                        ">Cancel</button>
                        <button id="confirmOk" style="
                            padding: 0.75rem 1.5rem;
                            border: none;
                            border-radius: 8px;
                            background: var(--primary);
                            color: white;
                            cursor: pointer;
                            font-weight: 500;
                            transition: all 0.3s ease;
                        ">${sanitizeHTML(confirmText)}</button>
                    </div>
                </div>
            </div>
        `;
        
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHTML;
        document.body.appendChild(modalDiv);
        
        document.getElementById('confirmCancel').onclick = () => {
            modalDiv.remove();
            resolve(false);
        };
        
        document.getElementById('confirmOk').onclick = () => {
            modalDiv.remove();
            resolve(true);
        };
        
        modalDiv.querySelector('.confirmation-modal').onclick = (e) => {
            if (e.target.classList.contains('confirmation-modal')) {
                modalDiv.remove();
                resolve(false);
            }
        };
    });
}
