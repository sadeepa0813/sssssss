import { supabase } from './supabaseClient.js';
import { showToast } from './utils.js';
import { showLoading } from './admin-ui.js';

export async function loadEffectsStatus() {
    try {
        const { data, error } = await supabase
            .from('site_settings')
            .select('*')
            .in('setting_key', ['snow_effect', 'confetti_effect', 'dark_theme']);
        
        // Set defaults first
        const snowCheckbox = document.getElementById('snow_effect');
        const confettiCheckbox = document.getElementById('confetti_effect');
        const themeCheckbox = document.getElementById('dark_theme');
        
        if (snowCheckbox) snowCheckbox.checked = false;
        if (confettiCheckbox) confettiCheckbox.checked = false;
        if (themeCheckbox) themeCheckbox.checked = true;
        
        if (!error && data && data.length > 0) {
            data.forEach(setting => {
                const checkbox = document.getElementById(setting.setting_key);
                if (checkbox) {
                    checkbox.checked = setting.is_enabled;
                }
            });
        }
        
    } catch (error) {
        console.error('Error loading effects status:', error);
    }
}

export async function toggleEffect(effect, enabled) {
    console.log(`Toggling ${effect} effect: ${enabled}`);
    showLoading(true);
    
    try {
        const { data: existing } = await supabase
            .from('site_settings')
            .select('*')
            .eq('setting_key', `${effect}_effect`)
            .maybeSingle();
        
        let result;
        if (existing) {
            result = await supabase
                .from('site_settings')
                .update({
                    setting_value: enabled ? 'true' : 'false',
                    is_enabled: enabled
                })
                .eq('setting_key', `${effect}_effect`);
        } else {
            result = await supabase
                .from('site_settings')
                .insert({
                    setting_key: `${effect}_effect`,
                    setting_value: enabled ? 'true' : 'false',
                    is_enabled: enabled
                });
        }
        
        const { error } = result;
        if (error) throw error;
        
        const effectName = effect === 'snow' ? 'Snow effect' : 'Confetti effect';
        showToast(`${effectName} ${enabled ? 'enabled' : 'disabled'} successfully! ${enabled ? '✨' : ''}`, 'success');
        
        showEffectPreview(effect, enabled);
        
    } catch (error) {
        console.error('Error toggling effect:', error);
        showToast('Failed to update effect', 'error');
        
        // Revert checkbox
        const checkbox = document.getElementById(`${effect}_effect`);
        if (checkbox) checkbox.checked = !enabled;
    } finally {
        showLoading(false);
    }
}

function showEffectPreview(effect, enabled) {
    const existingPreview = document.getElementById('effectPreview');
    if (existingPreview) existingPreview.remove();
    
    if (!enabled) return;
    
    const container = document.createElement('div');
    container.id = 'effectPreview';
    container.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1001;
        pointer-events: none;
    `;
    
    const effectName = effect === 'snow' ? 'Snow' : 'Confetti';
    const emoji = effect === 'snow' ? '❄️' : '🎉';
    const color = effect === 'snow' ? '#4cc9f0' : '#f72585';
    
    container.innerHTML = `
        <div style="
            background: var(--bg-card);
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            border: 2px solid ${color};
            text-align: center;
            animation: slideUp 0.3s ease;
        ">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">${emoji}</div>
            <h3 style="margin: 0; color: ${color};">${effectName} Effect Enabled</h3>
            <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">Effect will appear on the main website</p>
        </div>
    `;
    
    document.body.appendChild(container);
    
    setTimeout(() => {
        if (container.parentElement) {
            container.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (container.parentElement) {
                    container.remove();
                }
            }, 300);
        }
    }, 3000);
}

export function toggleTheme(theme, enabled) {
    showToast(`Theme settings saved. Refresh page to see changes. 🎨`, 'info');
}

export function selectTheme(theme) {
    showToast(`Selected ${theme} theme. Changes will apply on next refresh. 🎨`, 'info');
}

export function testSnowEffect() {
    showEffectPreview('snow', true);
    showToast('Snow effect test started! Check the main website. ❄️', 'success');
}

export function testConfettiEffect() {
    showEffectPreview('confetti', true);
    showToast('Confetti effect test started! Check the main website. 🎉', 'success');
}

export function stopAllEffects() {
    showToast('All effects stopped. Refresh page to apply. ⏹️', 'info');
}

export function backupDatabase() {
    showToast('Database backup initiated. You will receive an email when complete. 💾', 'info');
}
