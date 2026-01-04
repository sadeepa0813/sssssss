import { supabase } from './supabaseClient.js';
import { showToast } from './utils.js';

import { supabase } from './supabaseClient.js';
import { showToast, getIP } from './utils.js';

export async function loadExams() {
    console.log('Loading exams...');
    
    const grid = document.getElementById('examGrid');
    if (!grid) return;

    // 1. Load from Cache first
    const cachedExams = localStorage.getItem('exams_cache');
    if (cachedExams) {
        console.log('Loading exams from cache...');
        const data = JSON.parse(cachedExams);
        renderExams(data);
    }
    
    try {
        // 2. Fetch from Network
        // We also need to fetch ratings. We'll do a separate fetch for simplicity or join if using a view.
        // Let's fetch exams first.
        const { data: exams, error } = await supabase
            .from('exams')
            .select('*')
            .eq('status', 'enabled')
            .order('exam_date', { ascending: true });

        if (error) {
            console.error('Error loading exams:', error);
            throw error;
        }
        
        // Fetch ratings for these exams
        const examIds = exams.map(e => e.id);
        const { data: ratings } = await supabase
            .from('exam_ratings')
            .select('exam_id, rating')
            .in('exam_id', examIds);
            
        // Process ratings into the exam objects
        const examsWithRatings = exams.map(exam => {
            const examRatings = ratings ? ratings.filter(r => r.exam_id === exam.id) : [];
            const total = examRatings.length;
            const counts = {
                easy: examRatings.filter(r => r.rating === 'easy').length,
                medium: examRatings.filter(r => r.rating === 'medium').length,
                hard: examRatings.filter(r => r.rating === 'hard').length
            };
            return { ...exam, ratings: { total, counts } };
        });

        // 3. Update Cache & Render
        if (examsWithRatings) {
            // Check if data is different from cache (basic check)
            // We include ratings in cache now so it updates live
            localStorage.setItem('exams_cache', JSON.stringify(examsWithRatings));
            renderExams(examsWithRatings);
        }

    } catch (error) {
        console.error('Exams Error:', error);
        if (!cachedExams) {
            showToast('විභාග පූරණය කිරීමේ දෝෂයක්', 'error');
        }
    }
}

function renderExams(data) {
    const grid = document.getElementById('examGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (data && data.length > 0) {
        data.forEach(exam => {
            const card = createExamCard(exam);
            grid.appendChild(card);
            startTimerForExam(exam);
        });
    } else {
        grid.innerHTML = `
            <div class="exam-card" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <i class="fas fa-calendar-times" style="font-size: 3rem; color: #94a3b8; margin-bottom: 20px;"></i>
                <h3 style="color: #f8fafc; margin-bottom: 10px;">දැනට සක්‍රිය විභාග නොමැත</h3>
                <p style="color: #94a3b8;">නව විභාග එකතු කිරීමට පරිපාලක අඩවියට පිවිසෙන්න</p>
            </div>
        `;
    }
}

function createExamCard(exam) {
    const card = document.createElement('div');
    card.className = 'exam-card';
    card.id = `exam-${exam.id}`;
    
    const examDate = new Date(exam.exam_date);
    const formattedDate = examDate.toLocaleDateString('si-LK', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Rating calculations
    const ratings = exam.ratings || { total: 0, counts: { easy: 0, medium: 0, hard: 0 } };
    const total = ratings.total || 0;
    
    // Calculate percentages
    const easyPct = total ? Math.round((ratings.counts.easy / total) * 100) : 0;
    const medPct = total ? Math.round((ratings.counts.medium / total) * 100) : 0;
    const hardPct = total ? Math.round((ratings.counts.hard / total) * 100) : 0;
    
    // Determine user's previous vote
    const userVoteKey = `vote_exam_${exam.id}`;
    const userVoted = localStorage.getItem(userVoteKey);

    card.innerHTML = `
        <div class="exam-card-content">
            <h3>${exam.batch_name}</h3>
            <div class="exam-date">
                <i class="far fa-calendar-alt"></i>
                ${formattedDate}
            </div>
            
            <div class="timer-display">
                <div class="time-unit">
                    <span class="time-value" id="days-${exam.id}">00</span>
                    <span class="time-label">දින</span>
                </div>
                <div class="time-unit">
                    <span class="time-value" id="hours-${exam.id}">00</span>
                    <span class="time-label">පැය</span>
                </div>
                <div class="time-unit">
                    <span class="time-value" id="minutes-${exam.id}">00</span>
                    <span class="time-label">මිනි</span>
                </div>
                <div class="time-unit">
                    <span class="time-value" id="seconds-${exam.id}">00</span>
                    <span class="time-label">තත්</span>
                </div>
            </div>

            <!-- Rating Section -->
            <div class="exam-rating-section">
                <h4 class="rating-title">How difficult is this exam?</h4>
                
                <div class="rating-buttons ${userVoted ? 'voted' : ''}">
                    <button onclick="voteDifficulty(${exam.id}, 'easy')" class="rate-btn ${userVoted === 'easy' ? 'selected' : ''}" ${userVoted ? 'disabled' : ''}>
                        <span class="emoji">😌</span> Easy
                    </button>
                    <button onclick="voteDifficulty(${exam.id}, 'medium')" class="rate-btn ${userVoted === 'medium' ? 'selected' : ''}" ${userVoted ? 'disabled' : ''}>
                        <span class="emoji">😐</span> Medium
                    </button>
                    <button onclick="voteDifficulty(${exam.id}, 'hard')" class="rate-btn ${userVoted === 'hard' ? 'selected' : ''}" ${userVoted ? 'disabled' : ''}>
                        <span class="emoji">😵</span> Hard
                    </button>
                </div>

                <div class="rating-stats" style="${total > 0 ? 'display: block' : 'display: none'}">
                    <div class="stat-bar-container">
                        <div class="stat-label">Easy <span class="stat-val">${easyPct}%</span></div>
                        <div class="stat-track">
                            <div class="stat-fill easy" style="width: ${easyPct}%"></div>
                        </div>
                    </div>
                    <div class="stat-bar-container">
                        <div class="stat-label">Mid <span class="stat-val">${medPct}%</span></div>
                        <div class="stat-track">
                            <div class="stat-fill medium" style="width: ${medPct}%"></div>
                        </div>
                    </div>
                    <div class="stat-bar-container">
                        <div class="stat-label">Hard <span class="stat-val">${hardPct}%</span></div>
                        <div class="stat-track">
                            <div class="stat-fill hard" style="width: ${hardPct}%"></div>
                        </div>
                    </div>
                    <p class="total-votes">${total} students voted</p>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Global voting function
window.voteDifficulty = async function(examId, rating) {
    // 1. Check local storage
    if (localStorage.getItem(`vote_exam_${examId}`)) {
        showToast('You have already voted!', 'warning');
        return;
    }
    
    // 2. Optimistic UI update (optional, but let's just reload for accuracy or partial update)
    // We'll set the local storage immediately to prevent double clicks
    localStorage.setItem(`vote_exam_${examId}`, rating);
    
    // Update button state immediately
    const btnContainer = document.querySelector(`#exam-${examId} .rating-buttons`);
    if (btnContainer) {
        btnContainer.classList.add('voted');
        const btns = btnContainer.querySelectorAll('button');
        btns.forEach(b => {
            b.disabled = true;
            if (b.innerText.toLowerCase().includes(rating)) b.classList.add('selected');
        });
    }

    try {
        const ip = await getIP().catch(() => 'unknown');
        
        const { error } = await supabase
            .from('exam_ratings')
            .insert([{ exam_id: examId, rating: rating, ip_address: ip }]);

        if (error) throw error;
        
        showToast('Thanks for your vote! 🗳️', 'success');
        
        // Reload data to update stats
        loadExams();

    } catch (error) {
        console.error('Voting failed:', error);
        localStorage.removeItem(`vote_exam_${examId}`); // Undo
        showToast('Voting failed, please try again.', 'error');
        // Reset UI if needed (simple reload will fix)
        loadExams(); 
    }
};

function startTimerForExam(exam) {
    const targetDate = new Date(exam.exam_date).getTime();
    const examId = exam.id;
    
    function updateTimer() {
        const now = new Date().getTime();
        const timeLeft = targetDate - now;
        
        if (timeLeft < 0) {
            const card = document.getElementById(`exam-${examId}`);
            if (card) {
                card.querySelector('.timer-display').innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <span style="color: #4cc9f0; font-weight: bold; font-size: 1.2rem;">
                            <i class="fas fa-check-circle"></i> විභාගය අවසන්
                        </span>
                    </div>
                `;
                card.style.opacity = '0.7';
            }
            return;
        }
        
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        // Update display elements
        const daysEl = document.getElementById(`days-${examId}`);
        const hoursEl = document.getElementById(`hours-${examId}`);
        const minutesEl = document.getElementById(`minutes-${examId}`);
        const secondsEl = document.getElementById(`seconds-${examId}`);
        
        if (daysEl) daysEl.textContent = days.toString().padStart(2, '0');
        if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
        if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
        if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
    }
    
    // Initial update
    updateTimer();
    
    // Update every second
    setInterval(updateTimer, 1000);
}
