import { supabase } from './supabaseClient.js';
import { showToast, sanitizeHTML, getIP } from './utils.js';

let currentOffset = 0;
const PAGE_SIZE = 50;

export async function loadChat() {
    console.log('Loading chat system...');
    
    // Load saved username
    const savedName = localStorage.getItem('chat_user_name');
    if (savedName) {
        const nameInput = document.getElementById('chatName');
        if (nameInput) {
            nameInput.value = savedName;
        }
    }

    // Reset offset
    currentOffset = 0;
    
    // Fetch initial comments
    await fetchComments();

    // Subscribe to real-time updates
    supabase
        .channel('public:comments')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'comments' 
        }, payload => {
            console.log('New chat message:', payload.new);
            appendComment(payload.new); // Real-time messages are always new, so append
        })
        .subscribe();
}

async function fetchComments(isLoadMore = false) {
    const chatBox = document.getElementById('chatBox');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    
    if (!chatBox) return;
    
    try {
        if (loadMoreBtn) loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .order('created_at', { ascending: false }) // Get newest first
            .range(currentOffset, currentOffset + PAGE_SIZE - 1);

        if (error) throw error;

        // Reset button
        if (loadMoreBtn) {
            loadMoreBtn.innerHTML = '<i class="fas fa-history"></i> Load Older Messages';
            loadMoreBtn.style.display = (data && data.length === PAGE_SIZE) ? 'block' : 'none';
        }

        if (!data || data.length === 0) {
            if (!isLoadMore) {
                // Show welcome if empty and initial load
                 // Remove welcome message if exists
                const welcomeMsg = chatBox.querySelector('.chat-welcome');
                if (welcomeMsg) welcomeMsg.remove();
                
                chatBox.innerHTML += `
                    <div class="chat-welcome" style="text-align: center; padding: 40px 20px; color: #94a3b8;">
                        <div class="welcome-icon" style="font-size: 3rem; color: #4361ee; opacity: 0.5; margin-bottom: 15px;">
                            <i class="fas fa-comment-alt"></i>
                        </div>
                        <h3 style="font-size: 1.5rem; margin-bottom: 10px; color: #f8fafc;">Welcome to Study Community!</h3>
                        <p style="font-size: 1rem; max-width: 400px; margin: 0 auto;">
                            Start chatting with fellow students. Share notes, ask questions, and study together.
                        </p>
                    </div>
                `;
            }
            return;
        }

        // Remove welcome message if exists
        const welcomeMsg = chatBox.querySelector('.chat-welcome');
        if (welcomeMsg) welcomeMsg.remove();

        // If initial load, clear container except button
        if (!isLoadMore) {
             // Keep the button, clear the rest? 
             // Easier to clear all and re-add button logic, but let's be precise.
             // We'll just clear everything and re-add the button if needed.
             // But wait, the button is IN the chatBox.
             // Let's grab the button element first.
             const btn = chatBox.querySelector('#loadMoreBtn');
             chatBox.innerHTML = '';
             if (btn) chatBox.appendChild(btn);
        }

        // Sort by date ascending for display (Oldest -> Newest)
        const commentsToDisplay = data.reverse();

        if (isLoadMore) {
            // Prepend logic
            // We need to insert AFTER the load more button
            const referenceNode = loadMoreBtn ? loadMoreBtn.nextSibling : chatBox.firstChild;
            
            // Create a fragment
            const fragment = document.createDocumentFragment();
            commentsToDisplay.forEach(comment => {
                const node = createCommentNode(comment);
                fragment.appendChild(node);
            });
            
            chatBox.insertBefore(fragment, referenceNode);
            
            // Maintain scroll position?
            // This is tricky. For now, let user scroll.
        } else {
            // Initial load - Append logic
            commentsToDisplay.forEach(comment => {
                const node = createCommentNode(comment);
                chatBox.appendChild(node);
            });
            scrollToBottom();
        }

        currentOffset += data.length;

    } catch (error) {
        console.error('Chat Error:', error);
        showToast('Failed to load messages', 'error');
    }
}

export function loadMoreMessages() {
    fetchComments(true);
}

function createCommentNode(comment) {
    const myName = localStorage.getItem('chat_user_name');
    const isMe = comment.user_name === myName;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isMe ? 'user' : 'other'}`;
    messageDiv.style.cssText = `
        max-width: 80%;
        padding: 15px 20px;
        border-radius: 18px;
        position: relative;
        animation: slideIn 0.3s ease;
        margin-bottom: 10px;
        ${isMe ? 
            'align-self: flex-end; background: linear-gradient(135deg, #4361ee, #7209b7); color: white; border-bottom-right-radius: 5px;' : 
            'align-self: flex-start; background: #2d3748; border: 1px solid #334155; color: #f8fafc; border-bottom-left-radius: 5px;'
        }
    `;
    
    const messageTime = new Date(comment.created_at).toLocaleTimeString('si-LK', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const safeName = sanitizeHTML(comment.user_name);
    const safeMessage = sanitizeHTML(comment.message);
    
    messageDiv.innerHTML = `
        <div class="message-header" style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        ">
            <span class="message-sender" style="
                font-weight: 600;
                font-size: 0.95rem;
            ">
                ${safeName}
            </span>
            <span class="message-time" style="
                font-size: 0.8rem;
                opacity: 0.8;
            ">
                ${messageTime}
            </span>
        </div>
        <div class="message-content" style="
            line-height: 1.5;
            word-wrap: break-word;
        ">
            ${safeMessage}
        </div>
    `;
    
    return messageDiv;
}

function appendComment(comment) {
    const chatBox = document.getElementById('chatBox');
    if (!chatBox) return;
    
    const node = createCommentNode(comment);
    chatBox.appendChild(node);
    scrollToBottom();
}

function scrollToBottom() {
    const chatBox = document.getElementById('chatBox');
    if (chatBox) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

export async function sendComment() {
    console.log('Sending chat message...');
    
    const nameInput = document.getElementById('chatName');
    const msgInput = document.getElementById('chatMessage');
    
    if (!nameInput || !msgInput) {
        console.error('Chat input elements not found!');
        return;
    }
    
    const name = nameInput.value.trim();
    const message = msgInput.value.trim();
    
    if (!name) {
        showToast('කරුණාකර ඔබේ නම ඇතුළත් කරන්න', 'warning');
        nameInput.focus();
        return;
    }
    
    if (!message) {
        showToast('කරුණාකර පණිවිඩය ඇතුළත් කරන්න', 'warning');
        msgInput.focus();
        return;
    }
    
    try {
        const ipAddress = await getIP();
        
        const { data: bannedUser } = await supabase
            .from('banned_users')
            .select('*')
            .or(`user_name.eq.${name},ip_address.eq.${ipAddress}`)
            .single();
        
        if (bannedUser) {
            showToast('මෙම පරිශීලකයා තහනම් කර ඇත', 'error');
            return;
        }
    } catch (error) {
        // User not banned, continue
    }
    
    localStorage.setItem('chat_user_name', name);
    
    try {
        const ipAddress = await getIP();
        
        const { error } = await supabase
            .from('comments')
            .insert([{ 
                user_name: name, 
                message: message,
                ip_address: ipAddress
            }]);
        
        if (error) {
            console.error('Error sending comment:', error);
            if (error.message.includes('banned')) {
                showToast('මෙම පරිශීලකයා තහනම් කර ඇත', 'error');
            } else {
                throw error;
            }
            return;
        }
        
        msgInput.value = '';
        msgInput.focus();
        
        console.log('Chat message sent successfully');
        
    } catch (error) {
        console.error('Send Comment Error:', error);
        showToast('පණිවිඩය යැවීමේ දෝෂයක්', 'error');
    }
}