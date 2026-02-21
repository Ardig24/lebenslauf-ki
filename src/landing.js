/**
 * Landing Page Scripts
 */

import { signIn, signUp, onAuthStateChange, getCurrentUser } from './services/authService.js';
import { isSupabaseConfigured } from './lib/supabase.js';
import { listCvs } from './services/cvService.js';
import { initToast, toast } from './toast.js';

// Initialize toast
initToast();

// ============================================
// Mobile Menu
// ============================================

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
const navActions = document.querySelector('.nav-actions');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks?.classList.toggle('mobile-open');
        navActions?.classList.toggle('mobile-open');
    });
}

// ============================================
// Auth Modal
// ============================================

const authModal = document.getElementById('auth-modal');
const btnLogin = document.getElementById('btn-login');
const btnSignup = document.getElementById('btn-signup');
const btnHeroSignup = document.getElementById('btn-hero-signup');
const btnCtaSignup = document.getElementById('btn-cta-signup');
const authModalClose = document.getElementById('auth-modal-close');
const authTabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');

function openAuthModal(mode = 'signup') {
    if (!authModal) return;

    // Set active tab
    authTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === mode);
    });

    // Show correct form
    if (mode === 'login') {
        loginForm.style.display = 'flex';
        signupForm.style.display = 'none';
        if (authTitle) authTitle.textContent = 'Welcome Back';
        if (authSubtitle) authSubtitle.textContent = 'Log in to continue building your CV';
    } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'flex';
        if (authTitle) authTitle.textContent = 'Create Your Account';
        if (authSubtitle) authSubtitle.textContent = 'Start building your professional German CV';
    }

    authModal.classList.add('open');
}

// Open auth modal - Login
if (btnLogin) {
    btnLogin.addEventListener('click', () => openAuthModal('login'));
}

// Open auth modal - Signup buttons
[btnSignup, btnHeroSignup, btnCtaSignup].forEach(btn => {
    if (btn) {
        btn.addEventListener('click', () => openAuthModal('signup'));
    }
});

// Close auth modal
if (authModalClose) {
    authModalClose.addEventListener('click', () => {
        authModal?.classList.remove('open');
    });
}

// Close on backdrop click
authModal?.addEventListener('click', (e) => {
    if (e.target === authModal) {
        authModal.classList.remove('open');
    }
});

// Close on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && authModal?.classList.contains('open')) {
        authModal.classList.remove('open');
    }
});

// Tab switching
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;

        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        if (tabName === 'login') {
            loginForm.style.display = 'flex';
            signupForm.style.display = 'none';
        } else {
            loginForm.style.display = 'none';
            signupForm.style.display = 'flex';
        }
    });
});

// ============================================
// Form Handlers
// ============================================

loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    const { user, error } = await signIn(email, password);

    if (error) {
        toast.error(error.message || 'Login failed. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log In';
        return;
    }

    // Smart redirect: check if user has CVs
    submitBtn.textContent = 'Loading...';
    const { cvs } = await listCvs(user.id);
    
    if (cvs && cvs.length > 0) {
        // User has CVs - go to dashboard
        window.location.href = '/dashboard.html';
    } else {
        // New user or no CVs - go to app to create first CV
        window.location.href = '/app.html';
    }
});

signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const submitBtn = signupForm.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    const { user, error } = await signUp(email, password, { full_name: name });

    if (error) {
        toast.error(error.message || 'Sign up failed. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
        return;
    }

    // Success - show confirmation
    toast.success('Account created! Please check your email to verify your account.');
    authModal?.classList.remove('open');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
});

// ============================================
// Check Auth State
// ============================================

async function checkAuthState() {
    if (!isSupabaseConfigured()) {
        return;
    }

    const { user } = await getCurrentUser();

    if (user) {
        // User is logged in - update UI
        if (btnLogin) {
            btnLogin.textContent = 'Dashboard';
            btnLogin.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = '/dashboard.html';
            }, { once: true });
        }
    }
}

// Initialize
checkAuthState();

// Listen for auth changes
onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
        // Smart redirect based on whether user has CVs
        const { cvs } = await listCvs(session.user.id);
        if (cvs && cvs.length > 0) {
            window.location.href = '/dashboard.html';
        } else {
            window.location.href = '/app.html';
        }
    }
});

// ============================================
// Smooth Scroll for anchor links
// ============================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// ============================================
// Floating Chat Bubbles Animation
// ============================================

const floatingContainer = document.getElementById('floating-bubbles-container');

if (floatingContainer) {
    const bubbleMessages = [
        { flag: '🇦🇱', text: 'Kam nevojë për një CV' },
        { flag: '🇹🇷', text: 'Bana profesyonel bir CV lazım' },
        { flag: '🇸🇦', text: 'أحتاج إلى سيرة ذاتية' },
        { flag: '🇺🇦', text: 'Мені потрібне резюме' },
        { flag: '🇵🇱', text: 'Potrzebuję niemieckiego CV' },
        { flag: '🇪🇸', text: 'Necesito un currículum' },
        { flag: '🇮🇹', text: 'Mi serve un curriculum' },
        { flag: '🇷🇴', text: 'Am nevoie de un CV' }
    ];

    let currentBubbleIndex = 0;

    function spawnBubble() {
        // Create bubble element
        const bubble = document.createElement('div');
        bubble.className = 'floating-bubble';

        // Pick sequential message
        const msg = bubbleMessages[currentBubbleIndex];
        currentBubbleIndex = (currentBubbleIndex + 1) % bubbleMessages.length;
        bubble.innerHTML = `<span class="flag">${msg.flag}</span> <span>"${msg.text}"</span>`;

        // Random position (focused on the right side, upper half)
        // Adjust these percentages to change spawn area
        const topPos = 10 + Math.random() * 40; // 10% to 50%
        const leftPos = 50 + Math.random() * 40; // 50% to 90%

        bubble.style.top = `${topPos}%`;
        bubble.style.left = `${leftPos}%`;

        // Append to container
        floatingContainer.appendChild(bubble);

        // Remove after animation completes (3.5s + small buffer)
        setTimeout(() => {
            if (bubble.parentNode === floatingContainer) {
                floatingContainer.removeChild(bubble);
            }
        }, 3600);
    }

    // Spawn initial bubble
    setTimeout(spawnBubble, 500);

    // Spawn a new bubble every randomly between 1s and 2s
    function scheduleNextBubble() {
        const nextTime = 1000 + Math.random() * 1000;
        setTimeout(() => {
            spawnBubble();
            scheduleNextBubble();
        }, nextTime);
    }

    scheduleNextBubble();
}

console.log('🚀 CVprofi Landing Page loaded');
