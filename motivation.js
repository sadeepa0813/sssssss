// Daily Sinhala Motivational Messages
const sinhalaMessages = {
    0: "සුභ ඉරිදා! හෙට ආරම්භ වන සතිය සඳහා සූදානම් වන්න.",
    1: "සුභ සදුදා! අද ඔබේ ඉලක්ක සාක්ෂාත් කර ගැනීමට පළමු පියවර ගන්න.",
    2: "සුභ අඟහරුවාදා! දැන් ඔබ කරන සෑම වැඩක්ම අනාගතය සාදයි.",
    3: "සුභ බදාදා! දැඩි වෙනවා, ඔබට හැකියාව තියෙනවා.",
    4: "සුභ බ්‍රහස්පතින්දා! අද ඔබේ දැනුම වැඩි කර ගන්න.",
    5: "සුභ සිකුරාදා! සතිය අවසානයේදී ඔබේ ප්‍රගතිය සමාලෝචනය කරන්න.",
    6: "සුභ සෙනසුරාදා! විවේක ගත කරන අතරම අල්ප වේලාවක් ඉගෙන ගන්න."
};

export function checkDailyMotivation() {
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const message = sinhalaMessages[today];
    
    if (!message) return;
    
    const lastShownDate = localStorage.getItem('last_motivation_date');
    const todayDate = new Date().toDateString();
    
    if (lastShownDate !== todayDate) {
        // Wait 3 seconds before showing
        setTimeout(() => {
            showDailyMotivation(message, today);
            localStorage.setItem('last_motivation_date', todayDate);
        }, 3000);
    }
}

function showDailyMotivation(message, dayIndex) {
    const days = ['ඉරිදා', 'සදුදා', 'අඟහරුවාදා', 'බදාදා', 'බ්‍රහස්පතින්දා', 'සිකුරාදා', 'සෙනසුරාදා'];
    const dayName = days[dayIndex];
    
    const motivationDiv = document.createElement('div');
    motivationDiv.className = 'daily-motivation';
    motivationDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #4361ee, #7209b7);
        color: white;
        padding: 20px;
        border-radius: 15px;
        box-shadow: 0 10px 25px rgba(67, 97, 238, 0.5);
        z-index: 1002;
        max-width: 350px;
        animation: slideInRight 0.5s ease;
        border-left: 5px solid #4cc9f0;
        font-family: 'Inter', sans-serif;
        cursor: pointer;
    `;
    
    motivationDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
            <div style="font-size: 2rem;">💪</div>
            <div>
                <h4 style="margin: 0; font-size: 1.1rem; color: white;">${dayName}ගේ උපදෙස</h4>
                <small style="opacity: 0.8; font-size: 0.8rem;">දිනෙක උපදෙසක්</small>
            </div>
        </div>
        <p style="margin: 0; line-height: 1.5; font-size: 1rem;">${message}</p>
        <div style="margin-top: 15px; text-align: right;">
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                padding: 5px 15px;
                border-radius: 20px;
                cursor: pointer;
                font-size: 0.9rem;
            ">
                හරි
            </button>
        </div>
    `;
    
    document.body.appendChild(motivationDiv);
    
    // Auto remove after 10 seconds
    setTimeout(() => {
        if (motivationDiv.parentElement) {
            motivationDiv.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => {
                if (motivationDiv.parentElement) {
                    motivationDiv.parentElement.removeChild(motivationDiv);
                }
            }, 500);
        }
    }, 10000);
}
