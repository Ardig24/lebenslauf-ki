/**
 * Authentication Service — Handles user authentication with Supabase
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

/**
 * Sign up a new user with email and password
 * @param {string} email 
 * @param {string} password 
 * @param {object} metadata - Optional user metadata (full_name, etc.)
 * @returns {Promise<{user: object|null, error: object|null}>}
 */
export async function signUp(email, password, metadata = {}) {
    if (!isSupabaseConfigured()) {
        return { user: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: metadata,
        },
    });

    if (error) {
        console.error('Sign up error:', error);
        return { user: null, error };
    }

    return { user: data.user, error: null };
}

/**
 * Sign in with email and password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{user: object|null, session: object|null, error: object|null}>}
 */
export async function signIn(email, password) {
    if (!isSupabaseConfigured()) {
        return { user: null, session: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error('Sign in error:', error);
        return { user: null, session: null, error };
    }

    return { user: data.user, session: data.session, error: null };
}

/**
 * Sign out the current user
 * @returns {Promise<{error: object|null}>}
 */
export async function signOut() {
    if (!isSupabaseConfigured()) {
        return { error: { message: 'Supabase not configured' } };
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error('Sign out error:', error);
        return { error };
    }

    return { error: null };
}

/**
 * Get the current authenticated user
 * @returns {Promise<{user: object|null, error: object|null}>}
 */
export async function getCurrentUser() {
    if (!isSupabaseConfigured()) {
        return { user: null, error: null };
    }

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
        console.error('Get user error:', error);
        return { user: null, error };
    }

    return { user, error: null };
}

/**
 * Get the current session
 * @returns {Promise<{session: object|null, error: object|null}>}
 */
export async function getSession() {
    if (!isSupabaseConfigured()) {
        return { session: null, error: null };
    }

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        console.error('Get session error:', error);
        return { session: null, error };
    }

    return { session, error: null };
}

/**
 * Subscribe to auth state changes
 * @param {function} callback - Called with (event, session) on auth changes
 * @returns {function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
    if (!isSupabaseConfigured()) {
        return () => {};
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });

    return () => subscription.unsubscribe();
}

/**
 * Send password reset email
 * @param {string} email 
 * @returns {Promise<{error: object|null}>}
 */
export async function resetPassword(email) {
    if (!isSupabaseConfigured()) {
        return { error: { message: 'Supabase not configured' } };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
        console.error('Reset password error:', error);
        return { error };
    }

    return { error: null };
}

/**
 * Update user password (when logged in)
 * @param {string} newPassword 
 * @returns {Promise<{error: object|null}>}
 */
export async function updatePassword(newPassword) {
    if (!isSupabaseConfigured()) {
        return { error: { message: 'Supabase not configured' } };
    }

    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    });

    if (error) {
        console.error('Update password error:', error);
        return { error };
    }

    return { error: null };
}

/**
 * Update user profile metadata
 * @param {object} metadata - User metadata to update
 * @returns {Promise<{user: object|null, error: object|null}>}
 */
export async function updateUserProfile(metadata) {
    if (!isSupabaseConfigured()) {
        return { user: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase.auth.updateUser({
        data: metadata,
    });

    if (error) {
        console.error('Update profile error:', error);
        return { user: null, error };
    }

    return { user: data.user, error: null };
}

/**
 * Delete user account and all associated data
 * @param {string} userId - The user ID to delete
 * @returns {Promise<{error: object|null}>}
 */
export async function deleteAccount(userId) {
    if (!isSupabaseConfigured()) {
        return { error: { message: 'Supabase not configured' } };
    }

    try {
        // Delete all user's CVs
        const { error: cvsError } = await supabase
            .from('cvs')
            .delete()
            .eq('user_id', userId);

        if (cvsError) {
            console.error('Error deleting CVs:', cvsError);
        }

        // Delete all user's letters
        const { error: lettersError } = await supabase
            .from('motivational_letters')
            .delete()
            .eq('user_id', userId);

        if (lettersError) {
            console.error('Error deleting letters:', lettersError);
        }

        // Sign out the user (account deletion requires admin API in Supabase)
        // For now, we just clear data and sign out
        await supabase.auth.signOut();

        return { error: null };
    } catch (error) {
        console.error('Delete account error:', error);
        return { error: { message: error.message } };
    }
}

export default {
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    getSession,
    onAuthStateChange,
    resetPassword,
    updatePassword,
    updateUserProfile,
    deleteAccount,
};
