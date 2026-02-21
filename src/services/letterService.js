/**
 * Motivational Letter Service
 * Handles CRUD operations for motivational letters in Supabase
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

/**
 * Save a motivational letter
 */
export async function saveLetter(letterData, letterId, userId) {
    if (!isSupabaseConfigured()) {
        return { letter: null, error: 'Supabase not configured' };
    }

    try {
        if (letterId) {
            // Update existing letter
            const { data, error } = await supabase
                .from('motivational_letters')
                .update({
                    cv_id: letterData.cvId,
                    job_url: letterData.jobUrl || null,
                    job_title: letterData.jobTitle || null,
                    company: letterData.company || null,
                    content: letterData.content,
                    updated_at: new Date().toISOString()
                })
                .eq('id', letterId)
                .eq('user_id', userId)
                .select()
                .single();

            return { letter: data, error };
        } else {
            // Create new letter
            const { data, error } = await supabase
                .from('motivational_letters')
                .insert({
                    user_id: userId,
                    cv_id: letterData.cvId,
                    job_url: letterData.jobUrl || null,
                    job_title: letterData.jobTitle || null,
                    company: letterData.company || null,
                    content: letterData.content
                })
                .select()
                .single();

            return { letter: data, error };
        }
    } catch (error) {
        console.error('Error saving letter:', error);
        return { letter: null, error: error.message };
    }
}

/**
 * Load a single motivational letter
 */
export async function loadLetter(letterId, userId) {
    if (!isSupabaseConfigured()) {
        return { letter: null, error: 'Supabase not configured' };
    }

    try {
        const { data, error } = await supabase
            .from('motivational_letters')
            .select('*')
            .eq('id', letterId)
            .eq('user_id', userId)
            .single();

        return { letter: data, error };
    } catch (error) {
        console.error('Error loading letter:', error);
        return { letter: null, error: error.message };
    }
}

/**
 * List all motivational letters for a user
 */
export async function listLetters(userId) {
    if (!isSupabaseConfigured()) {
        return { letters: [], error: 'Supabase not configured' };
    }

    try {
        const { data, error } = await supabase
            .from('motivational_letters')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        return { letters: data || [], error };
    } catch (error) {
        console.error('Error listing letters:', error);
        return { letters: [], error: error.message };
    }
}

/**
 * Delete a motivational letter
 */
export async function deleteLetter(letterId, userId) {
    if (!isSupabaseConfigured()) {
        return { error: 'Supabase not configured' };
    }

    try {
        const { error } = await supabase
            .from('motivational_letters')
            .delete()
            .eq('id', letterId)
            .eq('user_id', userId);

        return { error };
    } catch (error) {
        console.error('Error deleting letter:', error);
        return { error: error.message };
    }
}
