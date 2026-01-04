import { supabase } from './supabaseClient.js';
import { showToast } from './utils.js';

let activeNotifications = [];

export async function checkNotifications() {
    console.log('Checking notifications...');
    
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error loading notifications:', error);
            return;
        }

        activeNotifications = data || [];
        console.log(`Found ${activeNotifications.length} active notifications`);
        
        updateNotificationBadge();
        
        // Store last seen notification ID
        if (activeNotifications.length > 0) {
            const latestId = activeNotifications[0].id;
            localStorage.setItem('last_seen_notif', latestId);
        }
        
    } catch (error) {
        console.error('Notification Error:', error);
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    
    if (activeNotifications.length > 0) {
        badge.textContent = activeNotifications.length > 9 ? '9+' : activeNotifications.length;
        badge.style.display = 'flex';
        
        // Pulse animation for new notifications
        if (shouldShowNotificationPulse()) {
            badge.style.animation = 'pulse 2s infinite';
        }
    } else {
        badge.style.display = 'none';
    }
}

function shouldShowNotificationPulse() {
    const lastSeen = localStorage.getItem('last_seen_notif');
    if (!lastSeen && activeNotifications.length > 0) return true;
    
    if (activeNotifications.length > 0) {
        const latestNotificationId = activeNotifications[0].id;
        return lastSeen !== latestNotificationId;
    }
    
    return false;
}

export async function openNotifModal() {
    console.log('Opening notifications modal...');
    
    const modal = document.getElementById('notifModal');
    const contentDiv = document.getElementById('modalNotifContent');
    
    if (!modal || !contentDiv) {
        console.error('Notification modal elements not found!');
        return;
    }
    
    // Mark as seen
    if (activeNotifications.length > 0) {
        localStorage.setItem('last_seen_notif', activeNotifications[0].id);
        updateNotificationBadge();
    }
    
    if (activeNotifications.length === 0) {
        contentDiv.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <i class="far fa-bell" style="font-size: 3rem; color: #94a3b8; margin-bottom: 20px;"></i>
                <h4 style="color: #f8fafc; margin-bottom: 10px;">දැනට විශේෂ නිවේදන නොමැත</h4>
                <p style="color: #94a3b8;">නව නිවේදන සඳහා නිතර පරීක්ෂා කරන්න</p>
            </div>
        `;
    } else {
        contentDiv.innerHTML = activeNotifications.map(notif => {
            const notificationDate = new Date(notif.created_at);
            const formattedDate = notificationDate.toLocaleDateString('si-LK', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            let mediaContent = '';
            
            if (notif.image_url) {
                mediaContent += `
                    <div class="notification-media" style="margin: 15px 0;">
                        <img src="${notif.image_url}" alt="Notification Image" 
                             style="max-width: 100%; border-radius: 8px; border: 1px solid #334155;">
                    </div>
                `;
            }
            
            if (notif.pdf_url) {
                mediaContent += `
                    <div class="notification-actions" style="margin-top: 15px;">
                        <a href="${notif.pdf_url}" target="_blank" 
                           style="display: inline-flex; align-items: center; gap: 8px; 
                                  background: #f72585; color: white; padding: 8px 16px; 
                                  border-radius: 8px; text-decoration: none; font-weight: 500;">
                            <i class="fas fa-file-pdf"></i> PDF බාගත කරන්න
                        </a>
                    </div>
                `;
            }

            return `
                <div class="notification-item" style="
                    background: #1e293b;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                    border: 1px solid #334155;
                ">
                    <div class="notification-header" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 15px;
                    ">
                        <div class="notification-title" style="
                            font-size: 1.2rem;
                            font-weight: 600;
                            color: #f8fafc;
                            flex: 1;
                        ">
                            ${notif.title}
                        </div>
                        <div class="notification-date" style="
                            font-size: 0.85rem;
                            color: #94a3b8;
                            white-space: nowrap;
                            margin-left: 15px;
                        ">
                            ${formattedDate}
                        </div>
                    </div>
                    
                    <div class="notification-message" style="
                        color: #cbd5e1;
                        line-height: 1.6;
                        margin-bottom: 15px;
                        white-space: pre-wrap;
                    ">
                        ${notif.message || ''}
                    </div>
                    
                    ${mediaContent}
                </div>
            `;
        }).join('');
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

export function closeNotifModal() {
    const modal = document.getElementById('notifModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}
