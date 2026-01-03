import { supabase } from './supabaseClient.js';
import { showToast, sanitizeHTML } from './utils.js';
import { showLoading, showConfirmation } from './admin-ui.js';

export let allChatMessages = [];

export async function loadChatData() {
    try {
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        allChatMessages = data || [];
        const tableBody = document.getElementById('chatTable');
        
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (allChatMessages.length > 0) {
            allChatMessages.forEach(comment => {
                const date = new Date(comment.created_at);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-user-circle" style="color: var(--primary); font-size: 1.2rem;"></i>
                            <strong>${sanitizeHTML(comment.user_name)}</strong>
                        </div>
                    </td>
                    <td>${sanitizeHTML(comment.message.length > 100 ? comment.message.substring(0, 100) + '...' : comment.message)}</td>
                    <td>${sanitizeHTML(comment.ip_address || 'N/A')}</td>
                    <td>${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                        <button class="btn-icon" onclick="viewChatMessage(${comment.id})" title="View" aria-label="View Message">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteChatMessage(${comment.id})" title="Delete" aria-label="Delete Message">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn-icon" style="color: #f72585;" onclick="banUser('${sanitizeHTML(comment.user_name)}')" title="Ban User" aria-label="Ban User">
                            <i class="fas fa-ban"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            updateChatStats();
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        <i class="fas fa-comments" style="font-size: 3rem; opacity: 0.3; display: block; margin-bottom: 1rem;"></i>
                        No chat messages yet
                    </td>
                </tr>
            `;
        }
        
    } catch (error) {
        console.error('Error loading chat data:', error);
        showToast('Failed to load chat messages', 'error');
    }
}

export function updateChatStats() {
    const totalMessages = document.getElementById('totalMessages');
    const todayMessages = document.getElementById('todayMessages');
    const activeUsers = document.getElementById('activeUsers');
    
    if (totalMessages) {
        totalMessages.textContent = allChatMessages.length;
    }
    
    const today = new Date().toDateString();
    const todayCount = allChatMessages.filter(msg => 
        new Date(msg.created_at).toDateString() === today
    ).length;
    
    if (todayMessages) {
        todayMessages.textContent = todayCount;
    }
    
    const uniqueUsers = [...new Set(allChatMessages.map(msg => msg.user_name))].length;
    if (activeUsers) {
        activeUsers.textContent = uniqueUsers;
    }
}

export async function deleteChatMessage(id) {
    const confirmed = await showConfirmation(
        'Delete Message',
        'Are you sure you want to delete this chat message?',
        'Delete'
    );
    
    if (!confirmed) return;
    
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showToast('Chat message deleted successfully 🗑️', 'success');
        
        await loadChatData();
        window.dispatchEvent(new CustomEvent('admin:data_changed'));
        
    } catch (error) {
        console.error('Error deleting chat message:', error);
        showToast('Failed to delete chat message', 'error');
    } finally {
        showLoading(false);
    }
}

export async function banUser(userName) {
    const confirmed = await showConfirmation(
        'Ban User',
        `Are you sure you want to ban user "${userName}"? This will delete all their messages.`,
        'Ban'
    );
    
    if (!confirmed) return;
    
    showLoading(true);
    
    try {
        // Get current user for banned_by field
        const { data: { user } } = await supabase.auth.getUser();

        // Get user's IP
        const { data: userMessages } = await supabase
            .from('comments')
            .select('ip_address')
            .eq('user_name', userName)
            .limit(1);
        
        // Try to add to banned_users table
        try {
            await supabase
                .from('banned_users')
                .insert([{
                    user_name: userName,
                    ip_address: userMessages?.[0]?.ip_address || 'unknown',
                    banned_by: user?.email || 'admin',
                    reason: 'Inappropriate behavior in chat'
                }]);
        } catch (tableError) {
            console.log('banned_users table might not exist:', tableError);
        }
        
        // Delete all user's messages
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('user_name', userName);
        
        if (error) throw error;
        
        showToast(`User "${userName}" has been banned successfully 🚫`, 'success');
        await loadChatData();
        
    } catch (error) {
        console.error('Error banning user:', error);
        showToast('Failed to ban user', 'error');
    } finally {
        showLoading(false);
    }
}

export function refreshChat() {
    showLoading(true);
    setTimeout(async () => {
        await loadChatData();
        showLoading(false);
        showToast('Chat refreshed 🔄', 'success');
    }, 500);
}

export async function viewChatMessage(id) {
    const message = allChatMessages.find(m => m.id === id);
    if (!message) {
        showToast('Message not found', 'error');
        return;
    }
    
    const date = new Date(message.created_at);
    
    const modalHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        " onclick="if(event.target === this) this.remove()">
            <div style="
                background: var(--bg-card);
                padding: 2rem;
                border-radius: 12px;
                max-width: 600px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                animation: slideUp 0.3s ease;
            ">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.5rem;">
                    <h2 style="margin: 0; color: var(--text-primary);">
                        <i class="fas fa-user-circle" style="color: var(--primary);"></i>
                        ${sanitizeHTML(message.user_name)}
                    </h2>
                    <button onclick="this.closest('[style*=fixed]').remove()" style="
                        background: none;
                        border: none;
                        color: var(--text-secondary);
                        font-size: 1.5rem;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                    ">×</button>
                </div>
                
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">
                    <i class="fas fa-clock"></i>
                    ${date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
                
                <div style="
                    background: var(--bg-dark);
                    padding: 1.5rem;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                    color: var(--text-primary);
                    line-height: 1.6;
                    white-space: pre-wrap;
                ">
                    ${sanitizeHTML(message.message)}
                </div>
                
                ${message.ip_address ? `
                    <div style="
                        background: var(--bg-dark);
                        padding: 1rem;
                        border-radius: 8px;
                        color: var(--text-secondary);
                        font-size: 0.9rem;
                    ">
                        <i class="fas fa-network-wired"></i>
                        IP Address: ${sanitizeHTML(message.ip_address)}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHTML;
    document.body.appendChild(modalDiv);
}
