import { supabase } from './supabaseClient.js';
import { showToast } from './utils.js';

export async function loadExams() {
    console.log('Loading exams...');
    
    try {
        const { data, error } = await supabase
            .from('exams')
            .select('*')
            .eq('status', 'enabled')
            .order('exam_date', { ascending: true });

        if (error) {
            console.error('Error loading exams:', error);
            throw error;
        }

        const grid = document.getElementById('examGrid');
        if (!grid) {
            console.error('Exam grid element not found!');
            return;
        }
        
        grid.innerHTML = '';
        
        if (data && data.length > 0) {
            console.log(`Found ${data.length} exams`);
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
    } catch (error) {
        console.error('Exams Error:', error);
        showToast('විභාග පූරණය කිරීමේ දෝෂයක්', 'error');
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
        </div>
    `;
    
    return card;
}

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
