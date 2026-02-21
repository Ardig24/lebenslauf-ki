/**
 * CV Service — CRUD operations for CVs in Supabase
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

/**
 * Save a new CV or update an existing one
 * @param {object} cvData - The CV data object
 * @param {string|null} cvId - Optional CV ID for updates
 * @param {string} userId - The user ID
 * @returns {Promise<{cv: object|null, error: object|null}>}
 */
export async function saveCv(cvData, cvId = null, userId) {
    if (!isSupabaseConfigured()) {
        return { cv: null, error: { message: 'Supabase not configured' } };
    }

    const cvRecord = {
        user_id: userId,
        title: cvData.personal?.firstName 
            ? `${cvData.personal.firstName}'s CV` 
            : 'Untitled CV',
        template_id: cvData.templateId || 'modern',
        data: cvData,
        updated_at: new Date().toISOString(),
    };

    let result;

    if (cvId) {
        // Update existing CV
        result = await supabase
            .from('cvs')
            .update(cvRecord)
            .eq('id', cvId)
            .eq('user_id', userId) // Ensure user owns this CV
            .select()
            .single();
    } else {
        // Create new CV
        cvRecord.created_at = new Date().toISOString();
        result = await supabase
            .from('cvs')
            .insert(cvRecord)
            .select()
            .single();
    }

    if (result.error) {
        console.error('Save CV error:', result.error);
        return { cv: null, error: result.error };
    }

    return { cv: result.data, error: null };
}

/**
 * Load a CV by ID
 * @param {string} cvId - The CV ID
 * @param {string} userId - The user ID (for ownership check)
 * @returns {Promise<{cv: object|null, error: object|null}>}
 */
export async function loadCv(cvId, userId) {
    if (!isSupabaseConfigured()) {
        return { cv: null, error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase
        .from('cvs')
        .select('*')
        .eq('id', cvId)
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error('Load CV error:', error);
        return { cv: null, error };
    }

    return { cv: data, error: null };
}

/**
 * List all CVs for a user
 * @param {string} userId - The user ID
 * @returns {Promise<{cvs: array, error: object|null}>}
 */
export async function listCvs(userId) {
    if (!isSupabaseConfigured()) {
        return { cvs: [], error: { message: 'Supabase not configured' } };
    }

    const { data, error } = await supabase
        .from('cvs')
        .select('id, title, template_id, data, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('List CVs error:', error);
        return { cvs: [], error };
    }

    return { cvs: data || [], error: null };
}

/**
 * Delete a CV
 * @param {string} cvId - The CV ID
 * @param {string} userId - The user ID (for ownership check)
 * @returns {Promise<{error: object|null}>}
 */
export async function deleteCv(cvId, userId) {
    if (!isSupabaseConfigured()) {
        return { error: { message: 'Supabase not configured' } };
    }

    const { error } = await supabase
        .from('cvs')
        .delete()
        .eq('id', cvId)
        .eq('user_id', userId);

    if (error) {
        console.error('Delete CV error:', error);
        return { error };
    }

    return { error: null };
}

/**
 * Duplicate a CV
 * @param {string} cvId - The CV ID to duplicate
 * @param {string} userId - The user ID
 * @returns {Promise<{cv: object|null, error: object|null}>}
 */
export async function duplicateCv(cvId, userId) {
    if (!isSupabaseConfigured()) {
        return { cv: null, error: { message: 'Supabase not configured' } };
    }

    // First, load the original CV
    const { cv: original, error: loadError } = await loadCv(cvId, userId);
    
    if (loadError || !original) {
        return { cv: null, error: loadError || { message: 'CV not found' } };
    }

    // Create a copy with a new title
    const newCvData = {
        ...original.data,
    };

    const newRecord = {
        user_id: userId,
        title: `${original.title} (Copy)`,
        template_id: original.template_id,
        data: newCvData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('cvs')
        .insert(newRecord)
        .select()
        .single();

    if (error) {
        console.error('Duplicate CV error:', error);
        return { cv: null, error };
    }

    return { cv: data, error: null };
}

/**
 * Update CV title
 * @param {string} cvId - The CV ID
 * @param {string} title - New title
 * @param {string} userId - The user ID
 * @returns {Promise<{error: object|null}>}
 */
export async function updateCvTitle(cvId, title, userId) {
    if (!isSupabaseConfigured()) {
        return { error: { message: 'Supabase not configured' } };
    }

    const { error } = await supabase
        .from('cvs')
        .update({ 
            title, 
            updated_at: new Date().toISOString() 
        })
        .eq('id', cvId)
        .eq('user_id', userId);

    if (error) {
        console.error('Update CV title error:', error);
        return { error };
    }

    return { error: null };
}

export default {
    saveCv,
    loadCv,
    listCvs,
    deleteCv,
    duplicateCv,
    updateCvTitle,
};
