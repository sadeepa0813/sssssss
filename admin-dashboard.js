import { supabase } from './supabaseClient.js';
import { formatTimeAgo } from './admin-ui.js';
import { sanitizeHTML } from './utils.js';
import { allExams } from './admin-exams.js';
import { allNotifications } from './admin-notifications.js';
import { allChatMessages } from './admin-chat.js';

export async function loadDashboardStats() {
    try {
        const [examsResult, notificationsResult, commentsResult] = await Promise.allSettled([
            supabase.from('exams').select('*', { count: 'exact', head: true }),
            supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_active', true),
            supabase.from('comments').select('*', { count: 'exact', head: true })
        ]);
        
        // Update UI with results
        const statExams = document.getElementById('statExams');
        const statNotifications = document.getElementById('statNotifications');
        const statComments = document.getElementById('statComments');
        
        if (statExams) {
            statExams.textContent = examsResult.status === 'fulfilled' && examsResult.value.count ? examsResult.value.count : 0;
        }
        if (statNotifications) {
            statNotifications.textContent = notificationsResult.status === 'fulfilled' && notificationsResult.value.count ? notificationsResult.value.count : 0;
        }
        if (statComments) {
            statComments.textContent = commentsResult.status === 'fulfilled' && commentsResult.value.count ? commentsResult.value.count : 0;
        }
        
        // Get active users from last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const { data: activeUsers } = await supabase
            .from('comments')
            .select('user_name')
            .gte('created_at', yesterday.toISOString());
        
        const statUsers = document.getElementById('statUsers');
        if (statUsers) {
            if (activeUsers && activeUsers.length > 0) {
                const uniqueUsers = [...new Set(activeUsers.map(msg => msg.user_name))].length;
                statUsers.textContent = uniqueUsers;
            } else {
                statUsers.textContent = '0';
            }
        }
        
        // Render Charts
        await renderCharts();
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

let userActivityChart = null;
let examCategoriesChart = null;

async function renderCharts() {
    // 1. User Activity Chart (Messages per day for last 7 days)
    const ctx1 = document.getElementById('userActivityChart')?.getContext('2d');
    if (ctx1) {
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();
        
        // Fetch message counts for these days
        const { data: messages } = await supabase
            .from('comments')
            .select('created_at')
            .gte('created_at', last7Days[0]);
            
        const counts = last7Days.map(date => {
            return messages ? messages.filter(m => m.created_at.startsWith(date)).length : 0;
        });
        
        if (userActivityChart) userActivityChart.destroy();
        
        userActivityChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: last7Days.map(d => new Date(d).toLocaleDateString('en-US', { weekday: 'short' })),
                datasets: [{
                    label: 'Chat Messages',
                    data: counts,
                    borderColor: '#4361ee',
                    backgroundColor: 'rgba(67, 97, 238, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#334155' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }
    
    // 2. Exam Status Chart
    const ctx2 = document.getElementById('examCategoriesChart')?.getContext('2d');
    if (ctx2) {
        if (allExams.length === 0) return;
        
        const active = allExams.filter(e => e.status === 'enabled').length;
        const inactive = allExams.length - active;
        
        if (examCategoriesChart) examCategoriesChart.destroy();
        
        examCategoriesChart = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Active', 'Inactive'],
                datasets: [{
                    data: [active, inactive],
                    backgroundColor: ['#4cc9f0', '#f72585'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#cbd5e1' } }
                }
            }
        });
    }
}

export async function loadRecentActivity() {
    try {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;
        
        const recentActivities = [];
        
        // Get recent exams
        if (allExams.length > 0) {
            allExams.slice(0, 3).forEach(exam => {
                recentActivities.push({
                    type: 'exam',
                    title: `New exam added: ${exam.batch_name}`,
                    time: new Date(exam.created_at || exam.exam_date),
                    icon: 'fas fa-calendar-plus'
                });
            });
        }
        
        // Get recent notifications
        if (allNotifications.length > 0) {
            allNotifications.slice(0, 3).forEach(notif => {
                recentActivities.push({
                    type: 'notification',
                    title: `Notification: ${notif.title}`,
                    time: new Date(notif.created_at),
                    icon: 'fas fa-bell'
                });
            });
        }
        
        // Get recent chat messages
        if (allChatMessages.length > 0) {
            allChatMessages.slice(0, 2).forEach(msg => {
                recentActivities.push({
                    type: 'chat',
                    title: `New message from ${msg.user_name}`,
                    time: new Date(msg.created_at),
                    icon: 'fas fa-comment'
                });
            });
        }
        
        // Sort by time
        recentActivities.sort((a, b) => b.time - a.time);
        
        // Display top 5
        activityList.innerHTML = recentActivities.slice(0, 5).map(activity => `
            <div class="activity-item">
                <i class="${activity.icon}" style="color: var(--primary);"></i>
                <div>
                    <strong>${sanitizeHTML(activity.title)}</strong>
                    <small>${formatTimeAgo(activity.time)}</small>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}
