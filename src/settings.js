/**
 * Settings Page Scripts
 */

import { getCurrentUser, signOut, onAuthStateChange, updateUserProfile, updatePassword, deleteAccount } from './services/authService.js';
import { isSupabaseConfigured } from './lib/supabase.js';
import { toast, initToast } from './toast.js';
import { getUITranslations } from './i18n.js';

// Get UI translations
const ui = getUITranslations('en');

// DOM Elements
const userMenu = document.getElementById('user-menu');
const userAvatarBtn = document.getElementById('user-avatar-btn');
const userInitials = document.getElementById('user-initials');
const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const btnLogout = document.getElementById('btn-logout');

// Profile form
const profileForm = document.getElementById('profile-form');
const fullNameInput = document.getElementById('full-name');
const emailInput = document.getElementById('email');
const btnSaveProfile = document.getElementById('btn-save-profile');
const btnSaveText = document.getElementById('btn-save-text');

// Password form
const passwordForm = document.getElementById('password-form');
const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');
const btnUpdatePassword = document.getElementById('btn-update-password');
const btnPasswordText = document.getElementById('btn-password-text');

// Delete account
const btnDeleteAccount = document.getElementById('btn-delete-account');
const deleteModal = document.getElementById('delete-modal');
const deleteModalClose = document.getElementById('delete-modal-close');
const deleteConfirmInput = document.getElementById('delete-confirm');
const deleteCancel = document.getElementById('delete-cancel');
const deleteConfirmBtn = document.getElementById('delete-confirm-btn');

let currentUser = null;

// ============================================
// User Menu
// ============================================

userAvatarBtn?.addEventListener('click', () => {
    userMenu?.classList.toggle('open');
});

document.addEventListener('click', (e) => {
    if (!userMenu?.contains(e.target)) {
        userMenu?.classList.remove('open');
    }
});

btnLogout?.addEventListener('click', async () => {
    await signOut();
    toast.success(ui.toast_logout_success);
    setTimeout(() => {
        window.location.href = '/landing.html';
    }, 500);
});

// ============================================
// Initialize
// ============================================

async function init() {
    initToast();

    if (!isSupabaseConfigured()) {
        window.location.href = '/landing.html';
        return;
    }

    const { user } = await getCurrentUser();

    if (!user) {
        window.location.href = '/landing.html';
        return;
    }

    currentUser = user;
    populateUserData(user);
    setupEventListeners();
}

function populateUserData(user) {
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    if (userInitials) userInitials.textContent = initials;
    if (userName) userName.textContent = name;
    if (userEmail) userEmail.textContent = user.email;
    if (fullNameInput) fullNameInput.value = user.user_metadata?.full_name || '';
    if (emailInput) emailInput.value = user.email || '';
}

// ============================================
// Event Listeners
// ============================================

function setupEventListeners() {
    // Profile form
    profileForm?.addEventListener('submit', handleProfileSubmit);

    // Password form
    passwordForm?.addEventListener('submit', handlePasswordSubmit);

    // Delete account
    btnDeleteAccount?.addEventListener('click', openDeleteModal);
    deleteModalClose?.addEventListener('click', closeDeleteModal);
    deleteCancel?.addEventListener('click', closeDeleteModal);
    deleteModal?.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeDeleteModal();
    });

    // Delete confirmation input
    deleteConfirmInput?.addEventListener('input', () => {
        const value = deleteConfirmInput.value.trim().toUpperCase();
        deleteConfirmBtn.disabled = value !== 'DELETE';
    });

    deleteConfirmBtn?.addEventListener('click', handleDeleteAccount);
}

// ============================================
// Profile Update
// ============================================

async function handleProfileSubmit(e) {
    e.preventDefault();

    const fullName = fullNameInput?.value.trim();

    if (!fullName) {
        toast.warning(ui.validation_required);
        return;
    }

    btnSaveProfile.disabled = true;
    btnSaveText.textContent = ui.settings_saving;

    const { error } = await updateUserProfile({ full_name: fullName });

    if (error) {
        toast.error(ui.toast_error_save);
        btnSaveProfile.disabled = false;
        btnSaveText.textContent = ui.settings_save_changes;
        return;
    }

    toast.success(ui.settings_saved);
    btnSaveText.textContent = ui.settings_saved;

    // Update header
    if (userName) userName.textContent = fullName;
    const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    if (userInitials) userInitials.textContent = initials;

    setTimeout(() => {
        btnSaveProfile.disabled = false;
        btnSaveText.textContent = ui.settings_save_changes;
    }, 2000);
}

// ============================================
// Password Update
// ============================================

async function handlePasswordSubmit(e) {
    e.preventDefault();

    const newPassword = newPasswordInput?.value;
    const confirmPassword = confirmPasswordInput?.value;

    if (!newPassword || newPassword.length < 8) {
        toast.warning(ui.validation_password_min);
        return;
    }

    if (newPassword !== confirmPassword) {
        toast.warning(ui.validation_passwords_mismatch);
        return;
    }

    btnUpdatePassword.disabled = true;
    btnPasswordText.textContent = ui.settings_saving;

    const { error } = await updatePassword(newPassword);

    if (error) {
        toast.error(error.message || ui.toast_error_save);
        btnUpdatePassword.disabled = false;
        btnPasswordText.textContent = ui.settings_update_password;
        return;
    }

    toast.success(ui.settings_saved);
    btnPasswordText.textContent = ui.settings_saved;

    // Clear inputs
    newPasswordInput.value = '';
    confirmPasswordInput.value = '';

    setTimeout(() => {
        btnUpdatePassword.disabled = false;
        btnPasswordText.textContent = ui.settings_update_password;
    }, 2000);
}

// ============================================
// Delete Account
// ============================================

function openDeleteModal() {
    deleteModal.style.display = 'flex';
    deleteConfirmInput.value = '';
    deleteConfirmBtn.disabled = true;
}

function closeDeleteModal() {
    deleteModal.style.display = 'none';
}

async function handleDeleteAccount() {
    const confirmValue = deleteConfirmInput?.value.trim().toUpperCase();

    if (confirmValue !== 'DELETE') {
        return;
    }

    deleteConfirmBtn.disabled = true;
    deleteConfirmBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
        </svg>
        Deleting...
    `;

    const { error } = await deleteAccount(currentUser.id);

    if (error) {
        toast.error(error.message || ui.toast_error_delete);
        deleteConfirmBtn.disabled = false;
        deleteConfirmBtn.innerHTML = `<span>${ui.settings_delete_button}</span>`;
        return;
    }

    toast.success('Account deleted');
    
    setTimeout(() => {
        window.location.href = '/landing.html';
    }, 1000);
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

console.log('⚙️ CVprofi Settings loaded');
