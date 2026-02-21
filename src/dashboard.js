/**
 * Dashboard Scripts — CV & Letter Management
 */

import { getCurrentUser, signOut, onAuthStateChange } from './services/authService.js';
import { listCvs, deleteCv, duplicateCv, updateCvTitle, loadCv } from './services/cvService.js';
import { listLetters, saveLetter, deleteLetter } from './services/letterService.js';
import { isSupabaseConfigured } from './lib/supabase.js';
import { generateCoverLetter } from './services/aiService.js';
import { toast, initToast } from './toast.js';
import { getUITranslations } from './i18n.js';

// Get UI translations (default to German)
const ui = getUITranslations('de');

// ============================================
// DOM Elements
// ============================================

const cvGrid = document.getElementById('cv-grid');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const authRequired = document.getElementById('auth-required');
const userMenu = document.getElementById('user-menu');
const userAvatarBtn = document.getElementById('user-avatar-btn');
const userInitials = document.getElementById('user-initials');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const btnLogout = document.getElementById('btn-logout');

// Tab elements
const dashboardTabs = document.querySelectorAll('.dashboard-tab');
const tabCvs = document.getElementById('tab-cvs');
const tabLetters = document.getElementById('tab-letters');
const lettersGrid = document.getElementById('letters-grid');
const lettersLoadingState = document.getElementById('letters-loading-state');
const lettersEmptyState = document.getElementById('letters-empty-state');

// Letter modal elements
const letterModal = document.getElementById('letter-modal');
const letterModalClose = document.getElementById('letter-modal-close');
const letterStep1 = document.getElementById('letter-step-1');
const letterStep2 = document.getElementById('letter-step-2');
const letterStep3 = document.getElementById('letter-step-3');
const letterCvAvatar = document.getElementById('letter-cv-avatar');
const letterCvName = document.getElementById('letter-cv-name');
const letterCvTitle = document.getElementById('letter-cv-title');
const jobUrlInput = document.getElementById('job-url');
const jobTitleInput = document.getElementById('job-title');
const companyNameInput = document.getElementById('company-name');
const additionalInfoInput = document.getElementById('additional-info');
const letterCancelBtn = document.getElementById('letter-cancel');
const letterGenerateBtn = document.getElementById('letter-generate');
const letterRegenerateBtn = document.getElementById('letter-regenerate');
const letterCopyBtn = document.getElementById('letter-copy');
const letterSaveBtn = document.getElementById('letter-save');
const resultJobTitle = document.getElementById('result-job-title');
const resultCompany = document.getElementById('result-company');
const letterContent = document.getElementById('letter-content');

let currentUser = null;
let currentCvForLetter = null;
let currentEditingLetter = null; // For editing existing letters
let userCvs = [];
let userLetters = [];

// ============================================
// User Menu
// ============================================

userAvatarBtn?.addEventListener('click', () => {
    userMenu?.classList.toggle('open');
});

// Close menu on outside click
document.addEventListener('click', (e) => {
    if (!userMenu?.contains(e.target)) {
        userMenu?.classList.remove('open');
    }
});

// Logout
btnLogout?.addEventListener('click', async () => {
    await signOut();
    window.location.href = '/landing.html';
});

// ============================================
// Initialize
// ============================================

async function init() {
    // Initialize toast system
    initToast();
    
    if (!isSupabaseConfigured()) {
        // Supabase not configured - show auth required
        loadingState.style.display = 'none';
        authRequired.style.display = 'flex';
        return;
    }

    const { user } = await getCurrentUser();

    if (!user) {
        // Not logged in
        loadingState.style.display = 'none';
        authRequired.style.display = 'flex';
        return;
    }

    currentUser = user;
    updateUserUI(user);
    setupTabs();
    setupLetterModal();
    await loadUserCvs(user.id);
}

// ============================================
// Tab Switching
// ============================================

function setupTabs() {
    dashboardTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Update tab buttons
    dashboardTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    if (tabName === 'cvs') {
        tabCvs.style.display = 'block';
        tabCvs.classList.add('active');
        tabLetters.style.display = 'none';
        tabLetters.classList.remove('active');
    } else if (tabName === 'letters') {
        tabCvs.style.display = 'none';
        tabCvs.classList.remove('active');
        tabLetters.style.display = 'block';
        tabLetters.classList.add('active');
        
        // Load letters if not already loaded
        if (userLetters.length === 0 && currentUser) {
            loadUserLetters(currentUser.id);
        }
    }
}

function updateUserUI(user) {
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    if (userInitials) userInitials.textContent = initials;
    if (userName) userName.textContent = name;
    if (userEmail) userEmail.textContent = user.email;
}

// ============================================
// Load CVs
// ============================================

async function loadUserCvs(userId) {
    const { cvs, error } = await listCvs(userId);

    loadingState.style.display = 'none';

    if (error) {
        console.error('Failed to load CVs:', error);
        cvGrid.innerHTML = `
            <div class="loading-state">
                <p style="color: var(--danger);">Failed to load CVs. Please try again.</p>
            </div>
        `;
        return;
    }

    userCvs = cvs; // Store for letter generation

    if (cvs.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    renderCvCards(cvs);
}

function renderCvCards(cvs) {
    cvGrid.innerHTML = cvs.map(cv => {
        const data = cv.data || {};
        const personal = data.personal || {};
        const experience = data.experience || [];
        const education = data.education || [];
        const skills = data.skills || [];
        const summary = data.summary || '';
        
        const initials = (personal.firstName?.[0] || '') + (personal.lastName?.[0] || '') || '?';
        const hasName = personal.firstName || personal.lastName;
        const fullName = hasName ? [personal.firstName, personal.lastName].filter(Boolean).join(' ') : '';
        const title = personal.title || '';
        const isEmpty = !hasName && !title && experience.length === 0;
        
        const updatedAt = new Date(cv.updated_at).toLocaleDateString('de-DE', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        // Build mini preview content
        const latestJob = experience[0];
        const latestEdu = education[0];
        const topSkills = skills.slice(0, 3);

        return `
            <div class="cv-card" data-cv-id="${cv.id}">
                <div class="cv-card-preview ${isEmpty ? 'empty-state' : ''}">
                    <span class="template-badge">${cv.template_id || 'modern'}</span>
                    ${isEmpty ? `
                        <div class="empty-preview">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                            <span>Start building your CV</span>
                        </div>
                    ` : `
                        <div class="mini-cv">
                            <div class="mini-cv-header">
                                <div class="mini-cv-avatar">${escapeHtml(initials)}</div>
                                <div class="mini-cv-info">
                                    <div class="mini-cv-name">${escapeHtml(fullName)}</div>
                                    <div class="mini-cv-title">${escapeHtml(title)}</div>
                                </div>
                            </div>
                            ${summary ? `<div class="mini-cv-summary">${escapeHtml(summary.substring(0, 80))}${summary.length > 80 ? '...' : ''}</div>` : ''}
                            ${latestJob ? `
                                <div class="mini-cv-section">
                                    <div class="mini-cv-section-title">Experience</div>
                                    <div class="mini-cv-item">${escapeHtml(latestJob.position || '')} ${latestJob.company ? `@ ${escapeHtml(latestJob.company)}` : ''}</div>
                                </div>
                            ` : ''}
                            ${topSkills.length > 0 ? `
                                <div class="mini-cv-skills">
                                    ${topSkills.map(skill => `<span class="mini-skill">${escapeHtml(skill)}</span>`).join('')}
                                    ${skills.length > 3 ? `<span class="mini-skill more">+${skills.length - 3}</span>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    `}
                </div>
                <div class="cv-card-body">
                    <div class="cv-card-title">
                        <input type="text" value="${escapeHtml(cv.title)}" data-cv-id="${cv.id}" class="cv-title-input">
                    </div>
                    <div class="cv-card-meta">
                        <span>Updated ${updatedAt}</span>
                    </div>
                    <div class="cv-card-actions">
                        <a href="/app.html?cv=${cv.id}" class="btn btn-primary btn-sm">Edit</a>
                        <button class="btn btn-outline btn-sm btn-letter" data-cv-id="${cv.id}" title="Create Motivational Letter">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                        </button>
                        <button class="btn btn-outline btn-sm btn-duplicate" data-cv-id="${cv.id}" title="Duplicate">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                        <button class="btn btn-ghost btn-sm btn-delete" data-cv-id="${cv.id}" title="Delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Attach event listeners
    attachCardListeners();
}

function attachCardListeners() {
    // Title editing
    document.querySelectorAll('.cv-title-input').forEach(input => {
        input.addEventListener('blur', async () => {
            const cvId = input.dataset.cvId;
            const newTitle = input.value.trim();
            if (newTitle && currentUser) {
                await updateCvTitle(cvId, newTitle, currentUser.id);
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
        });
    });

    // Motivational Letter buttons
    document.querySelectorAll('.btn-letter').forEach(btn => {
        btn.addEventListener('click', async () => {
            const cvId = btn.dataset.cvId;
            await openLetterModal(cvId);
        });
    });

    // Duplicate buttons
    document.querySelectorAll('.btn-duplicate').forEach(btn => {
        btn.addEventListener('click', async () => {
            const cvId = btn.dataset.cvId;
            btn.disabled = true;
            btn.textContent = '...';

            const { cv, error } = await duplicateCv(cvId, currentUser.id);

            if (error) {
                toast.error(ui.toast_error_save);
                btn.disabled = false;
                btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                return;
            }
            
            toast.success(ui.toast_cv_duplicated);

            // Reload the list
            await loadUserCvs(currentUser.id);
        });
    });

    // Delete buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const cvId = btn.dataset.cvId;

            if (!confirm('Are you sure you want to delete this CV?')) {
                return;
            }

            btn.disabled = true;

            const { error } = await deleteCv(cvId, currentUser.id);

            if (error) {
                toast.error(ui.toast_error_delete);
                btn.disabled = false;
                return;
            }
            
            toast.success(ui.toast_cv_deleted);

            // Remove the card from DOM
            const card = btn.closest('.cv-card');
            card?.remove();

            // Check if grid is empty
            if (cvGrid.querySelectorAll('.cv-card').length === 0) {
                emptyState.style.display = 'block';
            }
        });
    });
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================
// Letters Management
// ============================================

async function loadUserLetters(userId) {
    if (lettersLoadingState) lettersLoadingState.style.display = 'flex';
    if (lettersEmptyState) lettersEmptyState.style.display = 'none';

    const { letters, error } = await listLetters(userId);

    if (lettersLoadingState) lettersLoadingState.style.display = 'none';

    if (error) {
        console.error('Failed to load letters:', error);
        lettersGrid.innerHTML = `
            <div class="loading-state">
                <p style="color: var(--danger);">Failed to load letters. Please try again.</p>
            </div>
        `;
        return;
    }

    userLetters = letters;

    if (letters.length === 0) {
        if (lettersEmptyState) lettersEmptyState.style.display = 'block';
        return;
    }

    renderLetterCards(letters);
}

function renderLetterCards(letters) {
    lettersGrid.innerHTML = letters.map(letter => {
        const createdAt = new Date(letter.created_at).toLocaleDateString('de-DE', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        const preview = letter.content?.substring(0, 150) + '...' || 'No content';

        return `
            <div class="letter-card" data-letter-id="${letter.id}">
                <div class="letter-card-header">
                    <div class="letter-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                    </div>
                    <div class="letter-card-info">
                        <div class="letter-card-title">${escapeHtml(letter.job_title || 'Untitled')}</div>
                        <div class="letter-card-company">${escapeHtml(letter.company || 'No company')}</div>
                    </div>
                </div>
                <div class="letter-card-body">
                    <div class="letter-card-preview">${escapeHtml(preview)}</div>
                </div>
                <div class="letter-card-meta">
                    <span class="letter-card-date">Created ${createdAt}</span>
                    <div class="letter-card-actions">
                        <button class="btn btn-outline btn-sm btn-edit-letter" data-letter-id="${letter.id}" title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn btn-outline btn-sm btn-copy-letter" data-letter-id="${letter.id}" title="Copy">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                        <button class="btn btn-ghost btn-sm btn-delete-letter" data-letter-id="${letter.id}" title="Delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    attachLetterCardListeners();
}

function attachLetterCardListeners() {
    // Edit letter buttons
    document.querySelectorAll('.btn-edit-letter').forEach(btn => {
        btn.addEventListener('click', () => {
            const letterId = btn.dataset.letterId;
            openEditLetterModal(letterId);
        });
    });

    // Copy letter buttons
    document.querySelectorAll('.btn-copy-letter').forEach(btn => {
        btn.addEventListener('click', () => {
            const letterId = btn.dataset.letterId;
            const letter = userLetters.find(l => l.id === letterId);
            if (letter?.content) {
                navigator.clipboard.writeText(letter.content);
                btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                setTimeout(() => {
                    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                }, 2000);
            }
        });
    });

    // Delete letter buttons
    document.querySelectorAll('.btn-delete-letter').forEach(btn => {
        btn.addEventListener('click', async () => {
            const letterId = btn.dataset.letterId;

            if (!confirm('Are you sure you want to delete this letter?')) {
                return;
            }

            btn.disabled = true;

            const { error } = await deleteLetter(letterId, currentUser.id);

            if (error) {
                toast.error(ui.toast_error_delete);
                btn.disabled = false;
                return;
            }
            
            toast.success(ui.toast_letter_deleted);

            // Remove from local array
            userLetters = userLetters.filter(l => l.id !== letterId);

            // Remove the card from DOM
            const card = btn.closest('.letter-card');
            card?.remove();

            // Check if grid is empty
            if (lettersGrid.querySelectorAll('.letter-card').length === 0) {
                if (lettersEmptyState) lettersEmptyState.style.display = 'block';
            }
        });
    });
}

// ============================================
// Letter Modal
// ============================================

function setupLetterModal() {
    // Close modal
    letterModalClose?.addEventListener('click', closeLetterModal);
    letterCancelBtn?.addEventListener('click', closeLetterModal);
    letterModal?.addEventListener('click', (e) => {
        if (e.target === letterModal) closeLetterModal();
    });

    // Generate button
    letterGenerateBtn?.addEventListener('click', generateLetter);
    letterRegenerateBtn?.addEventListener('click', generateLetter);

    // Copy button
    letterCopyBtn?.addEventListener('click', () => {
        const content = letterContent.value;
        if (content) {
            navigator.clipboard.writeText(content);
            letterCopyBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Copied!
            `;
            setTimeout(() => {
                letterCopyBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copy
                `;
            }, 2000);
        }
    });

    // Save button
    letterSaveBtn?.addEventListener('click', saveCurrentLetter);
}

async function openLetterModal(cvId) {
    // Find the CV in our cached list
    const cv = userCvs.find(c => c.id === cvId);
    if (!cv) {
        toast.error(ui.toast_error_load);
        return;
    }

    currentCvForLetter = cv;
    const personal = cv.data?.personal || {};
    const fullName = [personal.firstName, personal.lastName].filter(Boolean).join(' ') || 'Unnamed';
    const initials = (personal.firstName?.[0] || '') + (personal.lastName?.[0] || '') || '?';

    // Update modal with CV info
    if (letterCvAvatar) letterCvAvatar.textContent = initials;
    if (letterCvName) letterCvName.textContent = fullName;
    if (letterCvTitle) letterCvTitle.textContent = personal.title || '';

    // Reset form
    if (jobUrlInput) jobUrlInput.value = '';
    if (jobTitleInput) jobTitleInput.value = '';
    if (companyNameInput) companyNameInput.value = '';
    if (additionalInfoInput) additionalInfoInput.value = '';

    // Show step 1
    showLetterStep(1);

    // Show modal
    if (letterModal) letterModal.style.display = 'flex';
}

function closeLetterModal() {
    if (letterModal) letterModal.style.display = 'none';
    currentCvForLetter = null;
    currentEditingLetter = null;
}

function openEditLetterModal(letterId) {
    const letter = userLetters.find(l => l.id === letterId);
    if (!letter) {
        toast.error(ui.toast_error_load);
        return;
    }

    currentEditingLetter = letter;
    
    // Find the associated CV if exists
    if (letter.cv_id) {
        currentCvForLetter = userCvs.find(c => c.id === letter.cv_id);
    }

    // Update modal header for edit mode
    const modalHeader = letterModal?.querySelector('.modal-header h2');
    if (modalHeader) modalHeader.textContent = ui.letter_edit || 'Edit Letter';

    // Pre-fill form fields
    if (jobUrlInput) jobUrlInput.value = letter.job_url || '';
    if (jobTitleInput) jobTitleInput.value = letter.job_title || '';
    if (companyNameInput) companyNameInput.value = letter.company || '';
    if (additionalInfoInput) additionalInfoInput.value = '';

    // Update CV info display
    if (currentCvForLetter) {
        const personal = currentCvForLetter.data?.personal || {};
        const fullName = [personal.firstName, personal.lastName].filter(Boolean).join(' ') || 'Unnamed';
        const initials = (personal.firstName?.[0] || '') + (personal.lastName?.[0] || '') || '?';
        if (letterCvAvatar) letterCvAvatar.textContent = initials;
        if (letterCvName) letterCvName.textContent = fullName;
        if (letterCvTitle) letterCvTitle.textContent = personal.title || '';
    } else {
        if (letterCvAvatar) letterCvAvatar.textContent = '?';
        if (letterCvName) letterCvName.textContent = 'No CV linked';
        if (letterCvTitle) letterCvTitle.textContent = '';
    }

    // Pre-fill the letter content and go directly to step 3
    if (resultJobTitle) resultJobTitle.textContent = letter.job_title || 'Position';
    if (resultCompany) resultCompany.textContent = letter.company ? `at ${letter.company}` : '';
    if (letterContent) letterContent.value = letter.content || '';

    // Show step 3 (result) directly for editing
    showLetterStep(3);

    // Update save button text
    if (letterSaveBtn) {
        letterSaveBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            ${ui.letter_update || 'Update Letter'}
        `;
    }

    // Show modal
    if (letterModal) letterModal.style.display = 'flex';
}

function showLetterStep(step) {
    if (letterStep1) letterStep1.style.display = step === 1 ? 'block' : 'none';
    if (letterStep2) letterStep2.style.display = step === 2 ? 'block' : 'none';
    if (letterStep3) letterStep3.style.display = step === 3 ? 'block' : 'none';
}

async function generateLetter() {
    if (!currentCvForLetter) return;

    const jobTitle = jobTitleInput?.value.trim() || '';
    const company = companyNameInput?.value.trim() || '';
    const jobUrl = jobUrlInput?.value.trim() || '';
    const additionalInfo = additionalInfoInput?.value.trim() || '';

    if (!jobTitle && !company) {
        toast.warning(ui.validation_required);
        return;
    }

    // Show generating state
    showLetterStep(2);

    try {
        // Get full CV data
        const cvData = currentCvForLetter.data || {};

        // Generate the letter using secure Edge Function with full CV data
        const letterText = await generateCoverLetter({
            cvData,
            jobTitle,
            company,
            jobUrl,
            additionalInfo
        });

        // Update result
        if (resultJobTitle) resultJobTitle.textContent = jobTitle || 'Position';
        if (resultCompany) resultCompany.textContent = company ? `at ${company}` : '';
        if (letterContent) letterContent.value = letterText;

        // Show result
        showLetterStep(3);

    } catch (error) {
        console.error('Failed to generate letter:', error);
        toast.error(ui.toast_error);
        showLetterStep(1);
    }
}

async function saveCurrentLetter() {
    if (!currentUser) return;

    const content = letterContent?.value || '';
    const jobTitle = jobTitleInput?.value.trim() || resultJobTitle?.textContent || '';
    const company = companyNameInput?.value.trim() || '';
    const jobUrl = jobUrlInput?.value.trim() || '';

    if (!content) {
        toast.warning(ui.validation_required);
        return;
    }

    letterSaveBtn.disabled = true;
    letterSaveBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
        </svg>
        ${ui.settings_saving || 'Saving...'}
    `;

    // Determine if we're updating or creating
    const letterId = currentEditingLetter?.id || null;
    const cvId = currentCvForLetter?.id || currentEditingLetter?.cv_id || null;

    const { letter, error } = await saveLetter({
        cvId,
        jobUrl,
        jobTitle,
        company,
        content
    }, letterId, currentUser.id);

    if (error) {
        toast.error(ui.toast_error_save);
        letterSaveBtn.disabled = false;
        letterSaveBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            ${ui.letter_save}
        `;
        return;
    }
    
    toast.success(ui.toast_letter_saved);

    // Update local array
    if (letter) {
        if (currentEditingLetter) {
            // Update existing letter in array
            const index = userLetters.findIndex(l => l.id === currentEditingLetter.id);
            if (index !== -1) {
                userLetters[index] = letter;
            }
            // Re-render the letters grid
            renderLetterCards(userLetters);
        } else {
            // Add new letter to array
            userLetters.unshift(letter);
        }
    }

    letterSaveBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Saved!
    `;

    setTimeout(() => {
        closeLetterModal();
        letterSaveBtn.disabled = false;
        letterSaveBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            Save Letter
        `;
    }, 1500);
}

// ============================================
// Auth State Changes
// ============================================

onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        window.location.href = '/landing.html';
    }
});

// Initialize
init();

console.log('📊 CVprofi Dashboard loaded');
