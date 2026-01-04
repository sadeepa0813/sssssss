import { supabase } from './supabaseClient.js';
import { showToast, sanitizeHTML } from './utils.js';
import { showLoading, showConfirmation } from './admin-ui.js';
import { rateLimiter } from './admin-auth.js';

export let allExams = [];

export async function loadExams() {
    try {
        const { data, error } = await supabase
            .from('exams')
            .select('*')
            .order('exam_date', { ascending: true });
        
        if (error) throw error;
        
        allExams = data || [];
        const tableBody = document.getElementById('examsTable');
        
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (allExams.length > 0) {
            allExams.forEach(exam => {
                const examDate = new Date(exam.exam_date);
                const now = new Date();
                const daysLeft = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td data-label="Exam Name">${sanitizeHTML(exam.batch_name)}</td>
                    <td data-label="Date">${examDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td data-label="Days Left">${daysLeft > 0 ? `${daysLeft} days` : 'Past'}</td>
                    <td data-label="Status"><span class="status-badge ${exam.status === 'enabled' ? 'status-active' : 'status-inactive'}">${exam.status === 'enabled' ? 'Active' : 'Inactive'}</span></td>
                    <td data-label="Actions">
                        <button class="btn-icon" onclick="toggleExamStatus(${exam.id}, '${exam.status}')" title="Toggle Status" aria-label="Toggle Exam Status">
                            <i class="fas fa-${exam.status === 'enabled' ? 'pause' : 'play'}"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteExam(${exam.id})" title="Delete" aria-label="Delete Exam">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        <i class="fas fa-inbox" style="font-size: 3rem; opacity: 0.3; display: block; margin-bottom: 1rem;"></i>
                        No exams found. Add your first exam above.
                    </td>
                </tr>
            `;
        }
        
    } catch (error) {
        console.error('Error loading exams:', error);
        showToast('Failed to load exams', 'error');
    }
}

export async function addNewExam() {
    const name = document.getElementById('examName')?.value.trim();
    const dateTime = document.getElementById('examDateTime')?.value;
    const description = document.getElementById('examDescription')?.value.trim();
    
    // Validation
    if (!name || !dateTime) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (name.length < 3) {
        showToast('Exam name must be at least 3 characters', 'error');
        return;
    }
    
    if (name.length > 100) {
        showToast('Exam name is too long (max 100 characters)', 'error');
        return;
    }
    
    // Check date validity
    const examDate = new Date(dateTime);
    if (isNaN(examDate.getTime())) {
        showToast('Invalid date/time', 'error');
        return;
    }
    
    // Rate limiting
    if (!rateLimiter.check('addExam', 10, 60000)) {
        showToast('Too many requests. Please wait a moment.', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // Check if exam exists
        const { data: existingExams } = await supabase
            .from('exams')
            .select('batch_name')
            .eq('batch_name', name)
            .limit(1);
        
        if (existingExams && existingExams.length > 0) {
            showToast('An exam with this name already exists', 'error');
            return;
        }
        
        // Prepare exam data
        const examData = {
            batch_name: name,
            exam_date: dateTime,
            description: description || '',
            status: 'enabled'
        };
        
        const { error } = await supabase
            .from('exams')
            .insert([examData]);
        
        if (error) throw error;
        
        showToast('Exam added successfully! 🎉', 'success');
        
        // Clear form
        document.getElementById('examName').value = '';
        document.getElementById('examDateTime').value = '';
        document.getElementById('examDescription').value = '';
        
        // Refresh data
        await loadExams();
        // Trigger generic data reload event if needed, but for now specific reload
        window.dispatchEvent(new CustomEvent('admin:data_changed'));
        
    } catch (error) {
        console.error('Error adding exam:', error);
        showToast('Failed to add exam: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

export async function toggleExamStatus(id, currentStatus) {
    const newStatus = currentStatus === 'enabled' ? 'disabled' : 'enabled';
    const action = newStatus === 'enabled' ? 'activate' : 'deactivate';
    
    const confirmed = await showConfirmation(
        'Change Exam Status',
        `Are you sure you want to ${action} this exam?`,
        action.charAt(0).toUpperCase() + action.slice(1)
    );
    
    if (!confirmed) return;
    
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('exams')
            .update({ status: newStatus })
            .eq('id', id);
        
        if (error) throw error;
        
        showToast(`Exam ${action}d successfully! ✅`, 'success');
        await loadExams();
        
    } catch (error) {
        console.error('Error toggling exam status:', error);
        showToast('Failed to update exam status', 'error');
    } finally {
        showLoading(false);
    }
}

export async function deleteExam(id) {
    const confirmed = await showConfirmation(
        'Delete Exam',
        'Are you sure you want to delete this exam? This action cannot be undone.',
        'Delete'
    );
    
    if (!confirmed) return;
    
    showLoading(true);
    
    try {
        const { data: exam } = await supabase
            .from('exams')
            .select('batch_name')
            .eq('id', id)
            .single();
        
        const { error } = await supabase
            .from('exams')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showToast(`"${exam?.batch_name || 'Exam'}" deleted successfully! 🗑️`, 'success');
        
        await loadExams();
        window.dispatchEvent(new CustomEvent('admin:data_changed'));
        
    } catch (error) {
        console.error('Error deleting exam:', error);
        showToast('Failed to delete exam', 'error');
    } finally {
        showLoading(false);
    }
}
