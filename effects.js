import { supabase } from './supabaseClient.js';
import { showToast } from './utils.js';

let effectCanvas = null;
let effectCtx = null;
let effectAnimationId = null;
let currentEffects = {
    snow: false,
    confetti: false
};

export async function initializeEffects() {
    console.log('Initializing effects system...');
    
    // Create canvas if it doesn't exist
    if (!document.getElementById('effectCanvas')) {
        const canvas = document.createElement('canvas');
        canvas.id = 'effectCanvas';
        canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
        `;
        document.body.appendChild(canvas);
    }
    
    effectCanvas = document.getElementById('effectCanvas');
    effectCtx = effectCanvas.getContext('2d');
    
    // Set initial canvas size
    resizeCanvas();
    
    // Listen for window resize
    window.addEventListener('resize', resizeCanvas);
    
    // Visibility API to pause animations
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (effectAnimationId) {
                cancelAnimationFrame(effectAnimationId);
                effectAnimationId = null;
            }
        } else {
            if (currentEffects.snow) startSnowEffect();
            else if (currentEffects.confetti) startConfettiEffect();
        }
    });

    console.log('Effects canvas initialized');
}

function resizeCanvas() {
    if (effectCanvas) {
        effectCanvas.width = window.innerWidth;
        effectCanvas.height = window.innerHeight;
    }
}

export async function startEffectsFromSettings() {
    console.log('Loading effects settings...');
    
    try {
        const { data, error } = await supabase
            .from('site_settings')
            .select('*')
            .in('setting_key', ['snow_effect', 'confetti_effect']);
        
        if (error) {
            console.error('Error loading effects settings:', error);
            return;
        }
        
        console.log('Effects settings loaded:', data);
        
        // Stop any existing effects
        stopAllEffects();
        
        if (data && data.length > 0) {
            const snowSetting = data.find(s => s.setting_key === 'snow_effect');
            const confettiSetting = data.find(s => s.setting_key === 'confetti_effect');
            
            // Check seasonal dates
            const now = new Date();
            const isDecember = now.getMonth() === 11; // December
            const isNewYear = now.getMonth() === 0 && now.getDate() <= 7; // Early January
            
            // Start snow effect if enabled and in December
            if (snowSetting && snowSetting.is_enabled) {
                if (isDecember) {
                    console.log('Starting seasonal snow effect');
                    startSnowEffect();
                } else {
                    console.log('Snow effect enabled but only shows in December');
                }
            }
            
            // Start confetti effect if enabled and around New Year
            if (confettiSetting && confettiSetting.is_enabled) {
                if (isNewYear) {
                    console.log('Starting seasonal confetti effect');
                    startConfettiEffect();
                } else {
                    console.log('Confetti effect enabled but only shows during New Year');
                }
            }
            
            // If no seasonal effects active, check for manual activation
            if (!currentEffects.snow && !currentEffects.confetti) {
                if (snowSetting && snowSetting.is_enabled) {
                    console.log('Starting snow effect (manual)');
                    startSnowEffect();
                } else if (confettiSetting && confettiSetting.is_enabled) {
                    console.log('Starting confetti effect (manual)');
                    startConfettiEffect();
                }
            }
        }
        
    } catch (error) {
        console.error('Error starting effects:', error);
    }
}

export function startSnowEffect() {
    console.log('Starting snow effect...');
    
    // Clear any existing animation
    if (effectAnimationId) {
        cancelAnimationFrame(effectAnimationId);
        effectAnimationId = null;
    }
    
    // Clear canvas
    if (effectCtx) {
        effectCtx.clearRect(0, 0, effectCanvas.width, effectCanvas.height);
    }
    
    // Initialize snow particles
    const particles = [];
    const particleCount = 120;
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * effectCanvas.width,
            y: Math.random() * effectCanvas.height,
            radius: Math.random() * 4 + 1,
            speed: Math.random() * 2 + 0.5,
            opacity: Math.random() * 0.6 + 0.3,
            sway: Math.random() * 1 - 0.5,
            wind: Math.random() * 0.3 - 0.15,
            color: `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.3})`
        });
    }
    
    currentEffects.snow = true;
    currentEffects.confetti = false;
    
    function animateSnow() {
        if (!effectCtx || !effectCanvas) return;
        
        // Clear with slight transparency for trail effect
        effectCtx.fillStyle = 'rgba(15, 23, 42, 0.05)';
        effectCtx.fillRect(0, 0, effectCanvas.width, effectCanvas.height);
        
        // Draw snow particles
        particles.forEach(particle => {
            effectCtx.beginPath();
            effectCtx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            effectCtx.fillStyle = particle.color;
            effectCtx.fill();
            
            // Add sparkle effect
            effectCtx.beginPath();
            effectCtx.arc(particle.x, particle.y, particle.radius/2, 0, Math.PI * 2);
            effectCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            effectCtx.fill();
            
            effectCtx.closePath();
        });
        
        // Update particle positions
        particles.forEach(particle => {
            particle.y += particle.speed;
            particle.x += particle.sway + particle.wind;
            
            // Add gentle swaying
            particle.sway += Math.sin(Date.now() / 2000 + particle.x) * 0.05;
            
            // Reset if out of bounds
            if (particle.y > effectCanvas.height + 10) {
                particle.y = -10;
                particle.x = Math.random() * effectCanvas.width;
                particle.speed = Math.random() * 2 + 0.5;
            }
            
            // Wrap around horizontally
            if (particle.x > effectCanvas.width + 10) {
                particle.x = -10;
            } else if (particle.x < -10) {
                particle.x = effectCanvas.width + 10;
            }
        });
        
        // Continue animation
        effectAnimationId = requestAnimationFrame(animateSnow);
    }
    
    animateSnow();
    console.log('Snow effect started successfully');
}

export function startConfettiEffect() {
    console.log('Starting confetti effect...');
    
    // Clear any existing animation
    if (effectAnimationId) {
        cancelAnimationFrame(effectAnimationId);
        effectAnimationId = null;
    }
    
    // Clear canvas
    if (effectCtx) {
        effectCtx.clearRect(0, 0, effectCanvas.width, effectCanvas.height);
    }
    
    // Initialize confetti particles
    const particles = [];
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#FF9FF3', '#54A0FF', '#00D2D3'];
    const particleCount = 180;
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * effectCanvas.width,
            y: Math.random() * effectCanvas.height - effectCanvas.height,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 10 + 5,
            speed: Math.random() * 4 + 1,
            angle: Math.random() * 360,
            rotationSpeed: Math.random() * 6 - 3,
            sway: Math.random() * 2 - 1,
            gravity: 0.05,
            opacity: Math.random() * 0.8 + 0.2,
            shape: Math.random() > 0.5 ? 'circle' : 'rect',
            delay: Math.random() * 100
        });
    }
    
    currentEffects.confetti = true;
    currentEffects.snow = false;
    let startTime = Date.now();
    
    function animateConfetti() {
        if (!effectCtx || !effectCanvas) return;
        
        const currentTime = Date.now() - startTime;
        
        // Clear with slight transparency
        effectCtx.fillStyle = 'rgba(15, 23, 42, 0.03)';
        effectCtx.fillRect(0, 0, effectCanvas.width, effectCanvas.height);
        
        // Draw confetti particles
        particles.forEach(particle => {
            // Skip delayed particles
            if (currentTime < particle.delay) return;
            
            effectCtx.save();
            effectCtx.translate(particle.x, particle.y);
            effectCtx.rotate(particle.angle * Math.PI / 180);
            effectCtx.globalAlpha = particle.opacity;
            
            if (particle.shape === 'circle') {
                // Draw circle confetti
                effectCtx.beginPath();
                effectCtx.arc(0, 0, particle.size/2, 0, Math.PI * 2);
                effectCtx.fillStyle = particle.color;
                effectCtx.fill();
                
                // Add highlight
                effectCtx.beginPath();
                effectCtx.arc(-particle.size/4, -particle.size/4, particle.size/4, 0, Math.PI * 2);
                effectCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                effectCtx.fill();
            } else {
                // Draw rectangle confetti
                effectCtx.fillStyle = particle.color;
                effectCtx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
                
                // Add pattern
                effectCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                effectCtx.lineWidth = 1;
                effectCtx.strokeRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
            }
            
            effectCtx.restore();
        });
        
        // Update particle positions
        particles.forEach(particle => {
            particle.y += particle.speed;
            particle.x += particle.sway;
            particle.angle += particle.rotationSpeed;
            particle.speed += particle.gravity;
            
            // Add wind effect
            particle.sway += Math.sin(Date.now() / 1000) * 0.1;
            
            // Fade out at bottom
            if (particle.y > effectCanvas.height * 0.8) {
                particle.opacity *= 0.97;
            }
            
            // Reset if out of bounds or faded out
            if (particle.y > effectCanvas.height || particle.opacity < 0.05) {
                particle.y = -20;
                particle.x = Math.random() * effectCanvas.width;
                particle.speed = Math.random() * 4 + 1;
                particle.opacity = Math.random() * 0.8 + 0.2;
                particle.color = colors[Math.floor(Math.random() * colors.length)];
            }
            
            // Wrap horizontally
            if (particle.x > effectCanvas.width + 20) {
                particle.x = -20;
            } else if (particle.x < -20) {
                particle.x = effectCanvas.width + 20;
            }
        });
        
        // Continue animation
        effectAnimationId = requestAnimationFrame(animateConfetti);
    }
    
    animateConfetti();
    console.log('Confetti effect started successfully');
}

export function stopAllEffects() {
    if (effectAnimationId) {
        cancelAnimationFrame(effectAnimationId);
        effectAnimationId = null;
    }
    
    if (effectCtx && effectCanvas) {
        effectCtx.clearRect(0, 0, effectCanvas.width, effectCanvas.height);
    }
    
    currentEffects.snow = false;
    currentEffects.confetti = false;
    
    console.log('All effects stopped');
}

// Test functions
export function testSnowEffect() {
    stopAllEffects();
    startSnowEffect();
    showToast('Snow effect test started! ❄️', 'success');
}

export function testConfettiEffect() {
    stopAllEffects();
    startConfettiEffect();
    showToast('Confetti effect test started! 🎉', 'success');
}
