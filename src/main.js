/**
 * CV Creator — Main Entry Point
 * Requires authentication before use
 */

import './styles/main.css';
import './styles/chat.css';
import './styles/editor.css';

import { ChatEngine } from './chat.js';
import { CVEditor } from './editor.js';
import { hasApiKey } from './openai.js';
import cvStore from './cvData.js';
import { getCurrentUser, signOut } from './services/authService.js';
import { saveCv, loadCv } from './services/cvService.js';
import { isSupabaseConfigured } from './lib/supabase.js';
import { initErrorTracking, setUserContext } from './errorTracking.js';
import { initToast } from './toast.js';

// Initialize error tracking early
initErrorTracking();

// ============================================
// Global State
// ============================================

let chatEngine = null;
let cvEditor = null;
let currentUser = null;
let currentCvId = null;
let saveTimeout = null;

// Check for CV ID in URL params
const urlParams = new URLSearchParams(window.location.search);
const cvIdFromUrl = urlParams.get('cv');

// ============================================
// Auth Check - Require login before using app
// ============================================

async function checkAuthAndInit() {
    if (!isSupabaseConfigured()) {
        window.location.href = '/landing.html';
        return;
    }

    const { user } = await getCurrentUser();

    if (!user) {
        window.location.href = '/landing.html?auth=required';
        return;
    }

    currentUser = user;
    setUserContext(user); // Set user context for error tracking
    initToast(); // Initialize toast notifications
    updateUserUI(user);
    initializeApp();
    
    if (cvIdFromUrl) {
        await loadExistingCv(cvIdFromUrl, user.id);
    }
}

function updateUserUI(user) {
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name-display');
    
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    
    if (userAvatar) {
        userAvatar.textContent = initials;
        userAvatar.title = name;
    }
    if (userName) {
        userName.textContent = name;
    }
    
    const btnDashboard = document.getElementById('btn-dashboard');
    const btnSave = document.getElementById('btn-save');
    const userMenu = document.getElementById('user-menu');
    
    if (btnDashboard) btnDashboard.style.display = 'inline-flex';
    if (btnSave) btnSave.style.display = 'inline-flex';
    if (userMenu) userMenu.style.display = 'flex';
}

// ============================================
// App Initialization
// ============================================

function initializeApp() {
    chatEngine = new ChatEngine();
    cvEditor = new CVEditor();
    
    setupTemplateSelection();
    setupPanelResize();
    setupSaveButton();
    setupUserMenu();
    setupAutoSave();
    
    console.log('✨ CVprofi initialized for', currentUser.email);
}

// ============================================
// Template Selection
// ============================================

function setupTemplateSelection() {
    const templatePanel = document.getElementById('template-panel');
    const chatPanel = document.getElementById('chat-panel');
    const templateCards = document.querySelectorAll('.template-card');
    const colorOptions = document.querySelectorAll('.color-option');
    
    // Create mobile toggle button
    createMobileToggleButton();
    
    window.addEventListener('chat-completed', () => {
        if (chatPanel) chatPanel.style.display = 'none';
        if (templatePanel) templatePanel.style.display = 'flex';
        if (cvEditor) cvEditor.switchTab('preview');
        
        // Show Export PDF button on template page
        const exportBtn = document.getElementById('btn-export-pdf');
        if (exportBtn) exportBtn.style.display = 'flex';
        
        // On mobile, switch to editor view
        if (window.innerWidth <= 768) {
            document.body.classList.add('mobile-show-editor');
            updateMobileToggleButton(true);
        }
    });
    
    templateCards.forEach(card => {
        card.addEventListener('click', () => {
            templateCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            cvStore.setTemplate(card.dataset.template);
        });
    });

    // Color selection
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            colorOptions.forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            cvStore.setAccentColor(option.dataset.color);
        });
    });
}

// ============================================
// Panel Resize
// ============================================

function setupPanelResize() {
    const resizeHandle = document.getElementById('resize-handle');
    const chatPanel = document.getElementById('chat-panel');
    const mainContent = document.querySelector('.main-content');
    
    if (!resizeHandle || !chatPanel || !mainContent) return;
    
    let isResizing = false;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizeHandle.classList.add('active');
        chatPanel.style.transition = 'none';
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const containerRect = mainContent.getBoundingClientRect();
        const newWidth = e.clientX - containerRect.left;
        const pct = (newWidth / containerRect.width) * 100;
        if (pct >= 25 && pct <= 65) {
            chatPanel.style.width = `${pct}%`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizeHandle.classList.remove('active');
            chatPanel.style.transition = '';
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}


// ============================================
// User Menu
// ============================================

function setupUserMenu() {
    const userMenu = document.getElementById('user-menu');
    const userAvatarBtn = document.getElementById('user-avatar');
    const btnLogout = document.getElementById('btn-logout');
    
    if (userAvatarBtn && userMenu) {
        userAvatarBtn.addEventListener('click', () => {
            userMenu.classList.toggle('open');
        });
        
        document.addEventListener('click', (e) => {
            if (!userMenu.contains(e.target)) {
                userMenu.classList.remove('open');
            }
        });
    }
    
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await signOut();
            window.location.href = '/landing.html';
        });
    }
}

// ============================================
// Save Functionality
// ============================================

function setupSaveButton() {
    const btnSave = document.getElementById('btn-save');
    
    if (btnSave) {
        btnSave.addEventListener('click', saveCurrentCv);
    }
}

function setupAutoSave() {
    cvStore.on('*', () => {
        if (!currentUser) return;
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveCurrentCv, 3000);
    });
}

async function loadExistingCv(cvId, userId) {
    const { cv, error } = await loadCv(cvId, userId);
    
    if (error || !cv) {
        console.error('Failed to load CV:', error);
        return;
    }

    currentCvId = cvId;
    
    const data = cv.data;
    if (data.personal) cvStore.setPersonalBulk(data.personal);
    if (data.summary) cvStore.setSummary(data.summary);
    if (data.experience) data.experience.forEach(exp => cvStore.addExperience(exp));
    if (data.education) data.education.forEach(edu => cvStore.addEducation(edu));
    if (data.skills) cvStore.setSkills(data.skills);
    if (data.languages) data.languages.forEach(lang => cvStore.addLanguage(lang));
    if (data.certifications) data.certifications.forEach(cert => cvStore.addCertification(cert));
    if (data.projects) data.projects.forEach(proj => cvStore.addProject(proj));
    if (data.hobbies) cvStore.setHobbies(data.hobbies);
    if (data.templateId) cvStore.setTemplate(data.templateId);
    if (data.accentColor) cvStore.setAccentColor(data.accentColor);

    // Hide chat panel and show template panel for editing existing CVs
    const chatPanel = document.getElementById('chat-panel');
    const templatePanel = document.getElementById('template-panel');
    
    if (chatPanel) chatPanel.style.display = 'none';
    if (templatePanel) templatePanel.style.display = 'flex';
    
    // On mobile, add the class to show editor view
    if (window.innerWidth <= 768) {
        document.body.classList.add('mobile-show-editor');
        updateMobileToggleButton(true);
    }
    
    // Update template card UI to show the saved template as active
    const templateCards = document.querySelectorAll('.template-card');
    const savedTemplate = data.templateId || 'modern';
    templateCards.forEach(card => {
        card.classList.toggle('active', card.dataset.template === savedTemplate);
    });
    
    // Update color option UI to show the saved color as active
    const colorOptions = document.querySelectorAll('.color-option');
    const savedColor = data.accentColor || 'emerald';
    colorOptions.forEach(option => {
        option.classList.toggle('active', option.dataset.color === savedColor);
    });
    
    // Switch to edit tab and render all data
    if (cvEditor) {
        cvEditor.renderAllSections();
        cvEditor.switchTab('edit');
    }
    
    // Show Export PDF button and Save button
    const exportBtn = document.getElementById('btn-export-pdf');
    const saveBtn = document.getElementById('btn-save');
    console.log('Export button found:', !!exportBtn, 'Save button found:', !!saveBtn);
    if (exportBtn) {
        exportBtn.style.display = 'inline-flex';
        exportBtn.style.cssText = 'display: inline-flex !important;';
    }
    if (saveBtn) {
        saveBtn.style.display = 'inline-flex';
    }

    console.log('✅ CV loaded from database - Editor mode', { 
        certifications: data.certifications?.length || 0,
        projects: data.projects?.length || 0,
        hobbies: data.hobbies?.length || 0
    });
}

async function saveCurrentCv() {
    if (!currentUser) return;

    const btnSave = document.getElementById('btn-save');
    const cvData = cvStore.getData();
    
    if (btnSave) {
        btnSave.disabled = true;
        btnSave.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
            </svg>
            Saving...
        `;
    }

    const { cv, error } = await saveCv(cvData, currentCvId, currentUser.id);

    if (error) {
        console.error('Failed to save CV:', error);
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save
            `;
        }
        return;
    }

    if (!currentCvId && cv) {
        currentCvId = cv.id;
        window.history.replaceState({}, '', `/app.html?cv=${cv.id}`);
    }

    if (btnSave) {
        btnSave.disabled = false;
        btnSave.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Saved!
        `;
        
        setTimeout(() => {
            btnSave.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save
            `;
        }, 2000);
    }

    console.log('✅ CV saved to database');
}

// ============================================
// Mobile View Toggle
// ============================================

function createMobileToggleButton() {
    // Only create on mobile
    if (window.innerWidth > 768) return;
    
    const btn = document.createElement('button');
    btn.className = 'mobile-view-toggle';
    btn.id = 'mobile-view-toggle';
    btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        Lebenslauf ansehen
    `;
    btn.style.display = 'none'; // Hidden until CV has content
    document.body.appendChild(btn);
    
    btn.addEventListener('click', toggleMobileView);
    
    // Show button when CV has content
    cvStore.subscribe(() => {
        const data = cvStore.getData();
        const hasContent = data.personal?.fullName || data.experience?.length > 0;
        btn.style.display = hasContent ? 'flex' : 'none';
    });
}

function toggleMobileView() {
    const isShowingEditor = document.body.classList.toggle('mobile-show-editor');
    updateMobileToggleButton(isShowingEditor);
}

function updateMobileToggleButton(isShowingEditor) {
    const btn = document.getElementById('mobile-view-toggle');
    if (!btn) return;
    
    if (isShowingEditor) {
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Zurück zum Chat
        `;
    } else {
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            Lebenslauf ansehen
        `;
    }
}

// ============================================
// Initialize
// ============================================

checkAuthAndInit();
