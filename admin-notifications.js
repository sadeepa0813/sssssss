import { supabase } from './supabaseClient.js';
import { showToast, sanitizeHTML } from './utils.js';
import { showLoading, showConfirmation } from './admin-ui.js';
import { rateLimiter } from './admin-auth.js';

export let allNotifications = [];
let selectedImageFile = null;
let selectedPDFFile = null;

export async function loadNotifications() {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allNotifications = data || [];
        const container = document.getElementById('notificationsList');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        if (allNotifications.length > 0) {
            const table = document.createElement('div');
            table.className = 'table-responsive';
            table.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Date</th>
                            <th>Priority</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allNotifications.map(notif => {
                            const date = new Date(notif.created_at);
                            const priorityText = notif.priority === 3 ? 'High' : notif.priority === 2 ? 'Medium' : 'Low';
                            const priorityClass = notif.priority === 3 ? 'status-active' : notif.priority === 2 ? 'status-warning' : 'status-inactive';
                            
                            return `
                                <tr>
                                    <td data-label="Title">${sanitizeHTML(notif.title)}</td>
                                    <td data-label="Date">${date.toLocaleDateString('en-US')}</td>
                                    <td data-label="Priority"><span class="status-badge ${priorityClass}">${priorityText}</span></td>
                                    <td data-label="Actions">
                                        <button class="btn-icon" onclick="viewNotification(${notif.id})" title="View" aria-label="View Notification">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn-icon btn-delete" onclick="deleteNotification(${notif.id})" title="Delete" aria-label="Delete Notification">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            container.appendChild(table);
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i class="fas fa-bell-slash" style="font-size: 3rem; opacity: 0.3; display: block; margin-bottom: 1rem;"></i>
                    <p style="margin: 0;">No active notifications</p>
                    <p style="font-size: 0.9rem; opacity: 0.7;">Create your first notification using the form above</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading notifications:', error);
        showToast('Failed to load notifications', 'error');
    }
}

export async function sendNotification() {
    const title = document.getElementById('notificationTitle')?.value.trim();
    const message = document.getElementById('notificationMessage')?.value.trim();
    const isImportant = document.getElementById('notificationImportant')?.checked;
    const isPersistent = document.getElementById('notificationPersistent')?.checked;
    
    // Validation
    if (!title) {
        showToast('Please enter a notification title', 'error');
        return;
    }
    
    if (title.length < 3) {
        showToast('Title must be at least 3 characters', 'error');
        return;
    }
    
    if (title.length > 200) {
        showToast('Title is too long (max 200 characters)', 'error');
        return;
    }
    
    // Rate limiting
    if (!rateLimiter.check('sendNotification', 5, 60000)) {
        showToast('Too many requests. Please wait a moment.', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        let imageUrl = null;
        let pdfUrl = null;
        
        // Upload image if exists
        if (selectedImageFile) {
            try {
                imageUrl = await uploadFile(selectedImageFile, 'notification-images');
            } catch (uploadError) {
                console.error('Image upload failed:', uploadError);
                showToast('Image upload failed, continuing without image', 'warning');
            }
        }
        
        // Upload PDF if exists
        if (selectedPDFFile) {
            try {
                pdfUrl = await uploadFile(selectedPDFFile, 'notification-pdfs');
            } catch (uploadError) {
                console.error('PDF upload failed:', uploadError);
                showToast('PDF upload failed, continuing without PDF', 'warning');
            }
        }
        
        // Prepare notification data
        const notificationData = {
            title: title,
            message: message || '',
            is_active: true,
            show_until_dismissed: isPersistent,
            priority: isImportant ? 3 : 1
        };
        
        // Only add URLs if they exist
        if (imageUrl) notificationData.image_url = imageUrl;
        if (pdfUrl) notificationData.pdf_url = pdfUrl;
        
        const { error } = await supabase
            .from('notifications')
            .insert([notificationData]);
        
        if (error) throw error;
        
        showToast('Notification sent successfully! 🔔', 'success');
        
        // Clear form
        document.getElementById('notificationTitle').value = '';
        document.getElementById('notificationMessage').value = '';
        document.getElementById('notificationImportant').checked = false;
        document.getElementById('notificationPersistent').checked = false;
        removeImage();
        removePDF();
        
        // Refresh data
        await loadNotifications();
        window.dispatchEvent(new CustomEvent('admin:data_changed'));
        
    } catch (error) {
        console.error('Error sending notification:', error);
        showToast('Failed to send notification: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

export async function deleteNotification(id) {
    const confirmed = await showConfirmation(
        'Delete Notification',
        'Are you sure you want to delete this notification?',
        'Delete'
    );
    
    if (!confirmed) return;
    
    showLoading(true);
    
    try {
        const { data: notif } = await supabase
            .from('notifications')
            .select('title')
            .eq('id', id)
            .single();
        
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showToast(`"${notif?.title || 'Notification'}" deleted successfully! 🗑️`, 'success');
        
        await loadNotifications();
        window.dispatchEvent(new CustomEvent('admin:data_changed'));
        
    } catch (error) {
        console.error('Error deleting notification:', error);
        showToast('Failed to delete notification', 'error');
    } finally {
        showLoading(false);
    }
}

export async function viewNotification(id) {
    const notification = allNotifications.find(n => n.id === id);
    if (!notification) {
        showToast('Notification not found', 'error');
        return;
    }
    
    const date = new Date(notification.created_at);
    
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
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                animation: slideUp 0.3s ease;
            ">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.5rem;">
                    <h2 style="margin: 0; color: var(--text-primary);">
                        <i class="fas fa-bell" style="color: var(--primary);"></i>
                        ${sanitizeHTML(notification.title)}
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
                    ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                
                <div style="
                    background: var(--bg-dark);
                    padding: 1.5rem;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                    color: var(--text-primary);
                    line-height: 1.6;
                ">
                    ${sanitizeHTML(notification.message || 'No message provided')}
                </div>
                
                ${notification.image_url ? `
                    <img src="${notification.image_url}" alt="Notification image" style="
                        width: 100%;
                        border-radius: 8px;
                        margin-bottom: 1rem;
                    ">
                ` : ''}
                
                ${notification.pdf_url ? `
                    <a href="${notification.pdf_url}" target="_blank" style="
                        display: inline-block;
                        padding: 0.75rem 1.5rem;
                        background: var(--primary);
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                        margin-top: 1rem;
                    ">
                        <i class="fas fa-file-pdf"></i> Download PDF
                    </a>
                ` : ''}
            </div>
        </div>
    `;
    
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHTML;
    document.body.appendChild(modalDiv);
}

// File Upload
async function uploadFile(file, bucket = 'notifications') {
    try {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) throw error;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);
        
        return publicUrl;
        
    } catch (error) {
        console.error('File upload error:', error);
        throw new Error('Failed to upload file: ' + error.message);
    }
}

// Image Preview Functions
export function previewImage(event) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById('imagePreviewContainer');
    const preview = document.getElementById('imagePreview');
    const fileName = document.getElementById('imageFileName');
    const fileSize = document.getElementById('imageFileSize');
    const dimensions = document.getElementById('imageDimensions');
    
    if (file) {
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            event.target.value = '';
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image size should be less than 5MB', 'error');
            event.target.value = '';
            return;
        }
        
        selectedImageFile = file;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            if (preview) preview.src = e.target.result;
            
            const img = new Image();
            img.onload = function() {
                if (dimensions) {
                    dimensions.textContent = `${img.width} × ${img.height} pixels`;
                }
            };
            img.src = e.target.result;
            
            const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
            const sizeInKB = (file.size / 1024).toFixed(0);
            
            if (fileName) {
                fileName.textContent = file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name;
            }
            if (fileSize) {
                fileSize.textContent = sizeInMB > 1 ? `${sizeInMB} MB` : `${sizeInKB} KB`;
            }
            if (previewContainer) {
                previewContainer.style.display = 'block';
            }
            
            showToast('Image selected successfully ✓', 'success');
        };
        reader.readAsDataURL(file);
    }
}

export function removeImage() {
    const imageInput = document.getElementById('notificationImage');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const preview = document.getElementById('imagePreview');
    
    if (imageInput) imageInput.value = '';
    if (preview) preview.src = '';
    if (previewContainer) previewContainer.style.display = 'none';
    
    selectedImageFile = null;
    showToast('Image removed 🗑️', 'info');
}

// PDF Preview Functions
export function previewPDF(event) {
    const file = event.target.files[0];
    let previewContainer = document.getElementById('pdfPreviewContainer');
    
    if (!previewContainer) {
        const pdfUploadSection = document.querySelector('.form-group:has(#notificationPdf)');
        if (pdfUploadSection) {
            const div = document.createElement('div');
            div.innerHTML = `
                <div id="pdfPreviewContainer" class="file-preview" style="display: none; margin-top: 1rem;">
                    <div class="file-preview-content">
                        <div class="file-icon">
                            <i class="fas fa-file-pdf" style="color: #f72585;"></i>
                            <span class="file-badge" id="pdfBadge">PDF</span>
                        </div>
                        <div class="file-info">
                            <div class="file-name" id="pdfFileName">document.pdf</div>
                            <div class="file-meta">
                                <span id="pdfFileSize">0 KB</span> • 
                                <span id="pdfPageCount">Pages: 0</span>
                            </div>
                        </div>
                        <div class="file-actions">
                            <button type="button" class="btn-icon" onclick="removePDF()" title="Remove">
                                <i class="fas fa-times"></i>
                            </button>
                            <button type="button" class="btn-icon" onclick="viewPDFInfo()" title="Details">
                                <i class="fas fa-info-circle"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            pdfUploadSection.appendChild(div);
            previewContainer = document.getElementById('pdfPreviewContainer');
        }
    }
    
    if (file) {
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            showToast('Please select a PDF file', 'error');
            event.target.value = '';
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            showToast('PDF size should be less than 10MB', 'error');
            event.target.value = '';
            return;
        }
        
        selectedPDFFile = file;
        
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        const sizeInKB = (file.size / 1024).toFixed(0);
        const estimatedPages = Math.max(1, Math.round(file.size / 50000));
        
        const fileName = document.getElementById('pdfFileName');
        const fileSize = document.getElementById('pdfFileSize');
        const pageCount = document.getElementById('pdfPageCount');
        
        if (fileName) {
            fileName.textContent = file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name;
        }
        if (fileSize) {
            fileSize.textContent = sizeInMB > 1 ? `${sizeInMB} MB` : `${sizeInKB} KB`;
        }
        if (pageCount) {
            pageCount.textContent = `Pages: ${estimatedPages} (est)`;
        }
        if (previewContainer) {
            previewContainer.style.display = 'block';
        }
        
        showToast('PDF selected successfully ✓', 'success');
    }
}

export function removePDF() {
    const pdfInput = document.getElementById('notificationPdf');
    const previewContainer = document.getElementById('pdfPreviewContainer');
    
    if (pdfInput) pdfInput.value = '';
    if (previewContainer) previewContainer.style.display = 'none';
    
    selectedPDFFile = null;
    showToast('PDF removed 🗑️', 'info');
}

export function viewFullImage() {
    if (!selectedImageFile) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = `
            <div id="fullImageModal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            " onclick="if(event.target === this) this.remove()">
                <button onclick="this.parentElement.remove()" style="
                    position: absolute;
                    top: 2rem;
                    right: 2rem;
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: white;
                    font-size: 2rem;
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    cursor: pointer;
                    z-index: 10002;
                ">×</button>
                <div style="max-width: 90%; max-height: 90%; text-align: center;">
                    <img src="${e.target.result}" style="max-width: 100%; max-height: 80vh; border-radius: 8px; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                    <p style="color: white; margin-top: 1rem;">${sanitizeHTML(selectedImageFile.name)} • ${(selectedImageFile.size / 1024).toFixed(0)}KB</p>
                </div>
            </div>
        `;
        document.body.appendChild(modalDiv);
        
        document.addEventListener('keydown', function closeOnEsc(e) {
            if (e.key === 'Escape') {
                modalDiv.remove();
                document.removeEventListener('keydown', closeOnEsc);
            }
        });
    };
    reader.readAsDataURL(selectedImageFile);
}

export function closeFullImage() {
    const modal = document.getElementById('fullImageModal');
    if (modal?.parentElement) {
        modal.parentElement.remove();
    }
}

export function viewPDFInfo() {
    if (!selectedPDFFile) return;
    
    const sizeInMB = (selectedPDFFile.size / (1024 * 1024)).toFixed(2);
    const sizeInKB = (selectedPDFFile.size / 1024).toFixed(0);
    const lastModified = new Date(selectedPDFFile.lastModified).toLocaleDateString();
    
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = `
        <div id="pdfInfoModal" style="
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
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            ">
                <button onclick="this.closest('[id=pdfInfoModal]').parentElement.remove()" style="
                    float: right;
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    font-size: 1.5rem;
                    cursor: pointer;
                ">×</button>
                
                <h3 style="margin: 0 0 1.5rem 0; color: var(--text-primary);">
                    <i class="fas fa-file-pdf" style="color: #f72585;"></i>
                    PDF Details
                </h3>
                
                <div style="background: var(--bg-dark); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="margin-bottom: 0.75rem;">
                        <strong style="color: var(--text-secondary);">File Name</strong>
                        <div style="color: var(--text-primary); margin-top: 0.25rem;">${sanitizeHTML(selectedPDFFile.name)}</div>
                    </div>
                    <div style="margin-bottom: 0.75rem;">
                        <strong style="color: var(--text-secondary);">File Size</strong>
                        <div style="color: var(--text-primary); margin-top: 0.25rem;">${sizeInMB > 1 ? `${sizeInMB} MB` : `${sizeInKB} KB`} (${selectedPDFFile.size.toLocaleString()} bytes)</div>
                    </div>
                    <div style="margin-bottom: 0.75rem;">
                        <strong style="color: var(--text-secondary);">File Type</strong>
                        <div style="color: var(--text-primary); margin-top: 0.25rem;">${selectedPDFFile.type || 'application/pdf'}</div>
                    </div>
                    <div>
                        <strong style="color: var(--text-secondary);">Last Modified</strong>
                        <div style="color: var(--text-primary); margin-top: 0.25rem;">${lastModified}</div>
                    </div>
                </div>
                
                <button onclick="this.closest('[id=pdfInfoModal]').parentElement.remove()" style="
                    width: 100%;
                    padding: 0.75rem;
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                ">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalDiv);
}

export function closePDFInfo() {
    const modal = document.getElementById('pdfInfoModal');
    if (modal?.parentElement) {
        modal.parentElement.remove();
    }
}
