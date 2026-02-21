/**
 * AI Chat Engine — Guided conversational flow for CV creation
 * 
 * Features:
 * - Language selection at start
 * - OpenAI-powered translation & enhancement
 * - Confirm flow: user types → AI enhances → user confirms → saved to CV
 * - Chat in user's language, CV always in professional German
 */

import cvStore from './cvData.js';
import { LANGUAGES, getTranslations } from './i18n.js';
import { enhanceContent, hasApiKey } from './openai.js';
import { enhanceContent as enhanceContentSecure, getSkillSuggestions as getSkillSuggestionsSecure, generateSummary, generateJobDescription, generateProjectDescription } from './services/aiService.js';
import { isSupabaseConfigured } from './lib/supabase.js';

// Fields that need AI enhancement (translation + professionalization)
const AI_ENHANCED_FIELDS = new Set([
    'title', 'summary', 'exp_title', 'exp_company', 'exp_description',
    'edu_degree', 'edu_school', 'location'
]);

// Fields that just need basic formatting (capitalize)
const FORMAT_ONLY_FIELDS = new Set(['fullName']);

// Fields that pass through as-is
const PASSTHROUGH_FIELDS = new Set(['email', 'phone', 'exp_date', 'edu_date']);

export class ChatEngine {
    constructor() {
        this.currentStep = -1;
        this.lang = null;
        this.langName = '';
        this.t = null;
        this.chatMessages = document.getElementById('chat-messages');
        this.chatForm = document.getElementById('chat-form');
        this.chatInput = document.getElementById('chat-input');
        this.chatSuggestions = document.getElementById('chat-suggestions');
        this.btnRestart = document.getElementById('btn-restart');

        this.tempExp = {};
        this.tempEdu = {};
        this.tempCert = {};
        this.tempProject = {};
        this.steps = [];

        // Pending confirmation state
        this.pendingConfirm = null;

        this.init();
    }

    init() {
        this.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserInput();
        });

        this.btnRestart.addEventListener('click', () => this.restart());

        setTimeout(() => this.showLanguageSelection(), 500);
    }

    restart() {
        this.currentStep = -1;
        this.lang = null;
        this.langName = '';
        this.t = null;
        this.tempExp = {};
        this.tempEdu = {};
        this.tempCert = {};
        this.tempProject = {};
        this.steps = [];
        this.pendingConfirm = null;
        this.chatMessages.innerHTML = '';
        this.chatSuggestions.innerHTML = '';
        this.chatInput.disabled = false;
        document.getElementById('btn-send').disabled = false;
        cvStore.reset();
        setTimeout(() => this.showLanguageSelection(), 400);
    }

    // ==========================================
    // LANGUAGE SELECTION
    // ==========================================

    async showLanguageSelection() {
        await this.showTypingThenMessage(
            "Welcome! Willkommen! 👋\nPlease select your language — Bitte wählen Sie Ihre Sprache:"
        );

        const selector = document.createElement('div');
        selector.className = 'language-selector';

        LANGUAGES.forEach(lang => {
            const btn = document.createElement('button');
            btn.className = 'lang-option';
            btn.innerHTML = `
        <span class="lang-flag">${lang.flag}</span>
        <span class="lang-name">${lang.name}<span class="lang-native">${lang.nameEn}</span></span>
      `;
            btn.addEventListener('click', () => {
                this.selectLanguage(lang);
                selector.remove();
            });
            selector.appendChild(btn);
        });

        this.chatMessages.appendChild(selector);
        this.scrollToBottom();

        this.chatInput.disabled = true;
        this.chatInput.placeholder = '↑ Select your language above';
        document.getElementById('btn-send').disabled = true;
    }

    selectLanguage(lang) {
        this.lang = lang.code;
        this.langName = lang.nameEn;
        this.t = getTranslations(lang.code);

        this.addMessage(`${lang.flag} ${lang.name}`, 'user');

        // Check API key
        if (!hasApiKey()) {
            this.showApiKeyPrompt();
            return;
        }

        this.startConversation();
    }

    showApiKeyPrompt() {
        const notice = document.createElement('div');
        notice.className = 'api-key-notice';
        notice.innerHTML = `
      <div class="api-notice-icon">🔑</div>
      <div class="api-notice-text">
        <strong>OpenAI API Key Required</strong>
        <p>To translate and enhance your CV content, please enter your OpenAI API key.</p>
        <button class="btn btn-accent" id="open-settings-btn" style="margin-top: 8px;">
          Enter API Key
        </button>
      </div>
    `;
        this.chatMessages.appendChild(notice);
        this.scrollToBottom();

        notice.querySelector('#open-settings-btn').addEventListener('click', () => {
            document.getElementById('settings-modal').classList.add('open');
        });

        // Listen for key being saved
        window.addEventListener('apikey-saved', () => {
            notice.remove();
            this.startConversation();
        }, { once: true });
    }

    startConversation() {
        this.buildSteps();
        this.chatInput.disabled = false;
        document.getElementById('btn-send').disabled = false;
        this.currentStep = 0;
        setTimeout(() => this.showCurrentStep(), 600);
    }

    buildSteps() {
        const t = this.t;
        this.steps = [
            { id: 'welcome', messages: t.welcome, field: 'fullName', placeholder: t.placeholder_name, suggestions: [], aiField: 'name' },
            { id: 'title', messages: [t.title_q], field: 'title', placeholder: t.placeholder_title, suggestions: t.suggestions_title || [], aiField: 'title' },
            { id: 'email', messages: [t.email_q], field: 'email', placeholder: t.placeholder_email, suggestions: [] },
            { id: 'phone', messages: [t.phone_q], field: 'phone', placeholder: t.placeholder_phone, suggestions: [t.skip] },
            { id: 'location', messages: [t.location_q], field: 'location', placeholder: t.placeholder_location, suggestions: t.suggestions_location || [], aiField: 'location' },
            { id: 'summary_intro', messages: t.summary_intro, field: 'summary', placeholder: t.placeholder_summary, suggestions: [], sectionLabel: t.section_summary, aiField: 'summary', showHelpButtons: true },
            { id: 'experience_intro', messages: t.exp_intro, field: 'exp_title', placeholder: t.placeholder_exp_title, suggestions: [], sectionLabel: t.section_experience, aiField: 'title', originalMessages: [...t.exp_intro] },
            { id: 'exp_company', messages: [t.exp_company_q], field: 'exp_company', placeholder: t.placeholder_exp_company, suggestions: [], aiField: 'company' },
            { id: 'exp_date', messages: [t.exp_date_q], field: 'exp_date', placeholder: t.placeholder_exp_date, suggestions: [] },
            { id: 'exp_description', messages: [t.exp_desc_q], field: 'exp_description', placeholder: t.placeholder_exp_desc, suggestions: [], aiField: 'description', showDescriptionButtons: true },
            { id: 'exp_more', messages: [t.exp_more_q], field: 'exp_more', placeholder: '', suggestions: [t.exp_more_yes, t.exp_more_no], isChoice: true },
            { id: 'education_intro', messages: t.edu_intro, field: 'edu_degree', placeholder: t.placeholder_edu_degree, suggestions: [], sectionLabel: t.section_education, aiField: 'degree', originalMessages: [...t.edu_intro] },
            { id: 'edu_school', messages: [t.edu_school_q], field: 'edu_school', placeholder: t.placeholder_edu_school, suggestions: [], aiField: 'school' },
            { id: 'edu_date', messages: [t.edu_date_q], field: 'edu_date', placeholder: t.placeholder_edu_date, suggestions: [] },
            { id: 'edu_more', messages: [t.edu_more_q], field: 'edu_more', placeholder: '', suggestions: [t.edu_more_yes, t.edu_more_no], isChoice: true },
            { id: 'skills_intro', messages: t.skills_intro, field: 'skills', placeholder: t.placeholder_skills, suggestions: [], sectionLabel: t.section_skills, aiField: 'skills', showSkillButtons: true },
            { id: 'languages_intro', messages: t.languages_intro, field: 'languages', placeholder: t.placeholder_languages, suggestions: [], sectionLabel: t.section_languages, aiField: 'languages' },
            // Certifications
            { id: 'cert_intro', messages: t.cert_intro, field: 'cert_name', placeholder: t.placeholder_cert_name, suggestions: [t.skip], sectionLabel: t.section_certifications, aiField: 'certification', originalMessages: [...(t.cert_intro || [])] },
            { id: 'cert_issuer', messages: [t.cert_issuer_q], field: 'cert_issuer', placeholder: t.placeholder_cert_issuer, suggestions: [t.skip], aiField: 'issuer' },
            { id: 'cert_date', messages: [t.cert_date_q], field: 'cert_date', placeholder: t.placeholder_cert_date, suggestions: [] },
            { id: 'cert_more', messages: [t.cert_more_q], field: 'cert_more', placeholder: '', suggestions: [t.cert_more_yes, t.cert_more_no], isChoice: true },
            // Projects
            { id: 'project_intro', messages: t.project_intro, field: 'project_name', placeholder: t.placeholder_project_name, suggestions: [t.skip], sectionLabel: t.section_projects, aiField: 'project', originalMessages: [...(t.project_intro || [])] },
            { id: 'project_desc', messages: [t.project_desc_q], field: 'project_description', placeholder: t.placeholder_project_desc, suggestions: [], aiField: 'project_description', showProjectDescButtons: true },
            { id: 'project_tech', messages: [t.project_tech_q], field: 'project_tech', placeholder: t.placeholder_project_tech, suggestions: [t.skip], aiField: 'technologies' },
            { id: 'project_more', messages: [t.project_more_q], field: 'project_more', placeholder: '', suggestions: [t.project_more_yes, t.project_more_no], isChoice: true },
            // Hobbies
            { id: 'hobbies_intro', messages: t.hobbies_intro, field: 'hobbies', placeholder: t.placeholder_hobbies, suggestions: [t.skip], sectionLabel: t.section_hobbies, aiField: 'hobbies' },
            { id: 'complete', messages: t.complete, field: null, suggestions: [] },
        ];
    }

    // ==========================================
    // CONVERSATION FLOW
    // ==========================================

    async showCurrentStep() {
        const step = this.steps[this.currentStep];
        if (!step) return;

        if (step.sectionLabel) {
            this.addSectionDivider(step.sectionLabel);
        }

        for (const msg of step.messages) {
            await this.showTypingThenMessage(msg);
        }

        this.updateProgress();
        this.showSuggestions(step.suggestions || []);

        if (step.placeholder) {
            this.chatInput.placeholder = step.placeholder;
        }

        if (step.field === null) {
            this.chatInput.disabled = true;
            this.chatInput.placeholder = this.t?.cv_complete || 'Your CV is complete!';
            document.getElementById('btn-send').disabled = true;

            // Show completion message - user can edit on the right, then click Next
            if (!this.chatMessages.querySelector('.chat-complete-notice')) {
                const noticeContainer = document.createElement('div');
                noticeContainer.className = 'chat-complete-notice';
                noticeContainer.innerHTML = `
                    <p>👉 ${this.t?.edit_notice || "You can edit any section on the right side. When you're ready, click <strong>Next</strong> below to choose a template."}</p>
                `;
                this.chatMessages.appendChild(noticeContainer);
                this.scrollToBottom();

                // Show the Next button at bottom of chat panel
                this.showNextButton();
            }
        } else {
            this.chatInput.disabled = false;
            document.getElementById('btn-send').disabled = false;
            this.chatInput.focus();
            
            // Show special action buttons for summary step
            if (step.showHelpButtons && hasApiKey()) {
                this.showSummaryHelpButtons();
            }
            
            // Show special action buttons for job description step
            if (step.showDescriptionButtons && hasApiKey()) {
                this.showDescriptionHelpButtons();
            }
            
            // Show special action buttons for project description step
            if (step.showProjectDescButtons && hasApiKey()) {
                this.showProjectDescHelpButtons();
            }
            
            // Show special action buttons for skills step
            if (step.showSkillButtons && hasApiKey()) {
                this.showSkillActionButtons();
            }
            
            // Show special action buttons for languages step
            if (step.field === 'languages') {
                this.showLanguageActionButtons();
            }
        }
    }

    showSummaryHelpButtons() {
        const container = document.createElement('div');
        container.className = 'action-buttons';
        container.innerHTML = `
            <button class="action-btn" id="btn-help-summary">
                <span class="action-icon">✨</span>
                <span>${this.t?.btn_help_summary || 'Help me write this'}</span>
            </button>
            <button class="action-btn secondary" id="btn-type-summary">
                <span class="action-icon">✏️</span>
                <span>${this.t?.btn_type_own || "I'll type my own"}</span>
            </button>
        `;
        this.chatMessages.appendChild(container);
        this.scrollToBottom();

        container.querySelector('#btn-help-summary').addEventListener('click', () => {
            container.remove();
            this.addMessage(this.t?.btn_help_summary || 'Help me write this', 'user');
            this.generateSummaryAI();
        });

        container.querySelector('#btn-type-summary').addEventListener('click', () => {
            container.remove();
            this.chatInput.focus();
        });
    }

    showDescriptionHelpButtons() {
        const container = document.createElement('div');
        container.className = 'action-buttons';
        container.innerHTML = `
            <button class="action-btn" id="btn-help-description">
                <span class="action-icon">✨</span>
                <span>${this.t?.btn_help_description || 'Help me describe this'}</span>
            </button>
            <button class="action-btn secondary" id="btn-type-description">
                <span class="action-icon">✏️</span>
                <span>${this.t?.btn_type_own || "I'll type my own"}</span>
            </button>
        `;
        this.chatMessages.appendChild(container);
        this.scrollToBottom();

        container.querySelector('#btn-help-description').addEventListener('click', () => {
            container.remove();
            this.addMessage(this.t?.btn_help_description || 'Help me describe this', 'user');
            this.generateJobDescriptionAI();
        });

        container.querySelector('#btn-type-description').addEventListener('click', () => {
            container.remove();
            this.chatInput.focus();
        });
    }

    showProjectDescHelpButtons() {
        const container = document.createElement('div');
        container.className = 'action-buttons';
        container.innerHTML = `
            <button class="action-btn" id="btn-help-project-desc">
                <span class="action-icon">✨</span>
                <span>${this.t?.btn_help_description || 'Help me describe this'}</span>
            </button>
            <button class="action-btn secondary" id="btn-type-project-desc">
                <span class="action-icon">✏️</span>
                <span>${this.t?.btn_type_own || "I'll type my own"}</span>
            </button>
        `;
        this.chatMessages.appendChild(container);
        this.scrollToBottom();

        container.querySelector('#btn-help-project-desc').addEventListener('click', () => {
            container.remove();
            this.addMessage(this.t?.btn_help_description || 'Help me describe this', 'user');
            this.generateProjectDescriptionAI();
        });

        container.querySelector('#btn-type-project-desc').addEventListener('click', () => {
            container.remove();
            this.chatInput.focus();
        });
    }

    showSkillActionButtons() {
        const container = document.createElement('div');
        container.className = 'action-buttons';
        container.innerHTML = `
            <button class="action-btn" id="btn-suggest-skills">
                <span class="action-icon">✨</span>
                <span>${this.t?.btn_suggest_skills || 'Suggest skills for my job'}</span>
            </button>
            <button class="action-btn secondary" id="btn-type-skills">
                <span class="action-icon">✏️</span>
                <span>${this.t?.btn_type_own || "I'll type my own"}</span>
            </button>
        `;
        this.chatMessages.appendChild(container);
        this.scrollToBottom();

        container.querySelector('#btn-suggest-skills').addEventListener('click', () => {
            container.remove();
            this.addMessage(this.t?.btn_suggest_skills || 'Suggest skills for my profession', 'user');
            this.suggestSkillsBasedOnJob();
        });

        container.querySelector('#btn-type-skills').addEventListener('click', () => {
            container.remove();
            this.chatInput.focus();
        });
    }

    showLanguageActionButtons() {
        const container = document.createElement('div');
        container.className = 'action-buttons';
        container.innerHTML = `
            <button class="action-btn" id="btn-pick-languages">
                <span class="action-icon">🌍</span>
                <span>${this.t?.btn_select_languages || 'Select from list'}</span>
            </button>
            <button class="action-btn secondary" id="btn-type-languages">
                <span class="action-icon">✏️</span>
                <span>${this.t?.btn_type_own || "I'll type my own"}</span>
            </button>
        `;
        this.chatMessages.appendChild(container);
        this.scrollToBottom();

        container.querySelector('#btn-pick-languages').addEventListener('click', () => {
            container.remove();
            this.addMessage(this.t?.btn_select_languages || 'Let me select from a list', 'user');
            this.showLanguagePicker();
        });

        container.querySelector('#btn-type-languages').addEventListener('click', () => {
            container.remove();
            this.chatInput.focus();
        });
    }

    showNextButton() {
        const chatPanel = document.getElementById('chat-panel');
        if (!chatPanel || chatPanel.querySelector('.chat-next-btn-container')) return;

        const btnContainer = document.createElement('div');
        btnContainer.className = 'chat-next-btn-container';
        btnContainer.innerHTML = `
            <button id="btn-next-to-templates" class="btn btn-accent btn-large">
                ${this.t?.btn_next || 'Next: Choose Template'} →
            </button>
        `;
        chatPanel.appendChild(btnContainer);

        btnContainer.querySelector('#btn-next-to-templates').addEventListener('click', () => {
            window.dispatchEvent(new Event('chat-completed'));
        });
    }

    handleUserInput() {
        const value = this.chatInput.value.trim();
        if (!value) return;

        this.addMessage(value, 'user');
        this.chatInput.value = '';
        this.chatSuggestions.innerHTML = '';

        // If we're waiting for confirmation
        if (this.pendingConfirm) {
            this.handleConfirmResponse(value);
            return;
        }

        this.processInput(value);
    }

    // ==========================================
    // PROCESS INPUT — with AI enhancement
    // ==========================================

    async processInput(value) {
        const step = this.steps[this.currentStep];
        if (!step) return;

        // Check if this field needs AI enhancement
        const needsAI = step.aiField && hasApiKey();

        // Handle choice fields (exp_more, edu_more) immediately
        if (step.isChoice) {
            this.handleChoice(step, value);
            return;
        }

        // Handle pass-through fields (email, phone, dates)
        if (PASSTHROUGH_FIELDS.has(step.field)) {
            this.handlePassthrough(step, value);
            return;
        }

        // Handle skills and languages specially
        if (step.field === 'skills') {
            await this.handleSkills(value);
            return;
        }
        if (step.field === 'languages') {
            await this.handleLanguages(value);
            return;
        }
        
        // Handle hobbies (comma-separated list)
        if (step.field === 'hobbies') {
            await this.handleHobbies(value);
            return;
        }
        
        // Handle skip for optional sections (certifications, projects, hobbies)
        const skipWord = this.t?.skip || 'skip';
        if (value.toLowerCase() === skipWord.toLowerCase()) {
            if (step.field === 'cert_name') {
                // Skip entire certifications section - jump to projects
                const projectIdx = this.steps.findIndex(s => s.id === 'project_intro');
                if (projectIdx > -1) {
                    this.currentStep = projectIdx;
                    this.showCurrentStep();
                    return;
                }
            } else if (step.field === 'project_name') {
                // Skip entire projects section - jump to hobbies
                const hobbiesIdx = this.steps.findIndex(s => s.id === 'hobbies_intro');
                if (hobbiesIdx > -1) {
                    this.currentStep = hobbiesIdx;
                    this.showCurrentStep();
                    return;
                }
            } else if (step.field === 'hobbies') {
                // Skip hobbies - jump to complete
                const completeIdx = this.steps.findIndex(s => s.id === 'complete');
                if (completeIdx > -1) {
                    this.currentStep = completeIdx;
                    this.showCurrentStep();
                    return;
                }
            }
        }

        // For fields that need AI enhancement
        if (needsAI) {
            await this.handleAIEnhancement(step, value);
        } else {
            // Fallback: basic formatting
            this.handleBasicFormat(step, value);
        }
    }

    // ==========================================
    // AI ENHANCEMENT + CONFIRM FLOW
    // ==========================================

    async handleAIEnhancement(step, rawValue) {
        // Disable input while processing
        this.chatInput.disabled = true;
        document.getElementById('btn-send').disabled = true;

        // Show "enhancing" indicator
        const enhancing = this.showEnhancingIndicator();

        try {
            const context = {
                jobTitle: cvStore.getPersonal().title || '',
            };

            // Use secure Edge Function if Supabase is configured, otherwise fallback to direct API
            let result;
            if (isSupabaseConfigured()) {
                result = await enhanceContentSecure(
                    rawValue,
                    step.aiField,
                    this.lang,
                    this.langName,
                    context
                );
            } else {
                result = await enhanceContent(
                    rawValue,
                    step.aiField,
                    this.lang,
                    this.langName,
                    context
                );
            }

            enhancing.remove();

            // Show the enhanced result and ask for confirmation
            this.showConfirmation(step, rawValue, result.german, result.explanation);
        } catch (error) {
            enhancing.remove();
            console.error('Enhancement failed:', error);

            // Show error and fall back to basic formatting
            this.addMessage(`⚠️ ${error.message}`, 'ai');
            this.handleBasicFormat(step, rawValue);
        }
    }

    showConfirmation(step, originalInput, germanText, explanation) {
        // Store pending confirmation
        this.pendingConfirm = {
            step,
            originalInput,
            germanText,
        };

        // Build the confirmation UI
        const confirmBlock = document.createElement('div');
        confirmBlock.className = 'confirm-block';
        confirmBlock.innerHTML = `
      <div class="confirm-header">
        <span class="confirm-icon">📝</span>
        <span class="confirm-label">CV Text</span>
      </div>
      <div class="confirm-german">${this.escapeHtml(germanText)}</div>
      ${explanation ? `<div class="confirm-explanation">${this.escapeHtml(explanation)}</div>` : ''}
      <div class="confirm-actions">
        <button class="btn btn-confirm" id="btn-confirm-yes">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          OK ✓
        </button>
        <button class="btn btn-edit" id="btn-confirm-edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          Edit
        </button>
      </div>
    `;

        this.chatMessages.appendChild(confirmBlock);
        this.scrollToBottom();

        // Confirm button
        confirmBlock.querySelector('#btn-confirm-yes').addEventListener('click', () => {
            this.confirmEnhanced(confirmBlock);
        });

        // Edit button — let user type a correction
        confirmBlock.querySelector('#btn-confirm-edit').addEventListener('click', () => {
            this.enableEditMode(confirmBlock);
        });

        // Enable input for potential edit/correction
        this.chatInput.disabled = false;
        document.getElementById('btn-send').disabled = false;
        this.chatInput.placeholder = '✏️ Type correction or click OK ✓';
        this.chatInput.focus();
    }

    confirmEnhanced(confirmBlock) {
        if (!this.pendingConfirm) return;

        const { step, germanText } = this.pendingConfirm;

        // Mark as confirmed
        confirmBlock.classList.add('confirmed');
        const actions = confirmBlock.querySelector('.confirm-actions');
        if (actions) {
            actions.innerHTML = '<span class="confirm-done">✅ Confirmed</span>';
        }

        // Save to CV store
        this.saveToStore(step, germanText);

        // Clear pending and advance
        this.pendingConfirm = null;
        this.advance();
    }

    enableEditMode(confirmBlock) {
        // Remove the confirm block actions and let user type freely
        const actions = confirmBlock.querySelector('.confirm-actions');
        if (actions) {
            actions.innerHTML = '<span class="confirm-editing">✏️ Type your version below...</span>';
        }

        this.chatInput.placeholder = '✏️ Type the correct German text...';
        this.chatInput.focus();
    }

    handleConfirmResponse(value) {
        if (!this.pendingConfirm) return;

        const { step, originalInput, germanText } = this.pendingConfirm;
        const lowerValue = value.toLowerCase().trim();

        // Check if this looks like feedback/request vs actual German CV content
        // Feedback is typically: short, conversational, contains request words
        // Actual edit is: longer, looks like CV content, similar structure to original
        const isFeedbackRequest = this.looksLikeFeedback(value, germanText);
        
        if (isFeedbackRequest) {
            // User is giving feedback - regenerate with their request
            this.pendingConfirm = null;
            
            // Mark old confirm block as processing
            const confirmBlocks = this.chatMessages.querySelectorAll('.confirm-block:not(.confirmed)');
            confirmBlocks.forEach(block => {
                block.classList.add('confirmed');
                const actions = block.querySelector('.confirm-actions');
                if (actions) {
                    actions.innerHTML = '<span class="confirm-done">🔄 Regenerating...</span>';
                }
            });

            // Re-run with the feedback
            this.regenerateWithFeedback(step, originalInput, value);
            return;
        }

        // User typed actual replacement content — use it directly
        const confirmBlocks = this.chatMessages.querySelectorAll('.confirm-block:not(.confirmed)');
        confirmBlocks.forEach(block => {
            block.classList.add('confirmed');
            const actions = block.querySelector('.confirm-actions');
            if (actions) {
                actions.innerHTML = '<span class="confirm-done">✏️ Edited</span>';
            }
        });

        // Show new text
        const correction = document.createElement('div');
        correction.className = 'confirm-block confirmed';
        correction.innerHTML = `
      <div class="confirm-header">
        <span class="confirm-icon">✅</span>
        <span class="confirm-label">CV Text (edited)</span>
      </div>
      <div class="confirm-german">${this.escapeHtml(value)}</div>
    `;
        this.chatMessages.appendChild(correction);
        this.scrollToBottom();

        // Save the user's correction
        this.saveToStore(step, value);

        this.pendingConfirm = null;
        this.advance();
    }

    looksLikeFeedback(input, originalGerman) {
        const lowerInput = input.toLowerCase().trim();
        
        // Short inputs are almost always feedback/requests
        if (input.length < 50) {
            return true;
        }
        
        // Check for common feedback/request patterns in multiple languages
        const feedbackPatterns = [
            // English
            'make it', 'can you', 'please', 'could you', 'shorter', 'longer', 'more', 'less',
            'change', 'different', 'better', 'another', 'try', 'again', 'no', 'not',
            // German
            'mach', 'kannst', 'bitte', 'kürzer', 'länger', 'mehr', 'weniger', 'änder',
            'anders', 'besser', 'andere', 'nochmal', 'nein', 'nicht',
            // Albanian
            'bej', 'shkurt', 'gjat', 'ndrysh', 'tjeter', 'lutem', 'mund', 'jo',
            // Turkish
            'yap', 'kısa', 'uzun', 'değiştir', 'başka', 'lütfen', 'hayır',
            // Arabic
            'اجعل', 'أقصر', 'أطول', 'غير', 'آخر', 'من فضلك', 'لا',
            // General
            '?', 'why', 'how', 'what'
        ];
        
        if (feedbackPatterns.some(pattern => lowerInput.includes(pattern))) {
            return true;
        }
        
        // If the input is significantly shorter than the original and doesn't look like CV content
        // (CV content usually has dashes, bullet points, formal structure)
        if (originalGerman && input.length < originalGerman.length * 0.3) {
            return true;
        }
        
        // If input doesn't contain typical German CV markers, it's probably feedback
        const cvMarkers = ['-', '•', 'und', 'bei', 'für', 'mit', 'von', 'der', 'die', 'das'];
        const hasCvStructure = cvMarkers.filter(m => lowerInput.includes(m)).length >= 2;
        
        if (!hasCvStructure && input.length < 150) {
            return true;
        }
        
        return false;
    }

    async regenerateWithFeedback(step, originalInput, feedback) {
        // Disable input while processing
        this.chatInput.disabled = true;
        document.getElementById('btn-send').disabled = true;

        const enhancing = this.showEnhancingIndicator();

        try {
            const context = {
                jobTitle: cvStore.getPersonal().title || '',
                feedback: feedback, // Pass the user's feedback
            };

            // Use secure Edge Function if Supabase is configured
            let result;
            if (isSupabaseConfigured()) {
                result = await enhanceContentSecure(
                    originalInput,
                    step.aiField,
                    this.lang,
                    this.langName,
                    context
                );
            } else {
                result = await enhanceContent(
                    originalInput,
                    step.aiField,
                    this.lang,
                    this.langName,
                    context
                );
            }

            enhancing.remove();

            // Show the new enhanced result
            this.showConfirmation(step, originalInput, result.german, result.explanation);
        } catch (error) {
            enhancing.remove();
            console.error('Regeneration failed:', error);
            this.addMessage(`⚠️ ${error.message}`, 'ai');
            this.handleBasicFormat(step, originalInput);
        }
    }

    // ==========================================
    // SAVE TO STORE
    // ==========================================

    saveToStore(step, value) {
        switch (step.field) {
            case 'fullName': {
                const parts = value.split(' ');
                const firstName = parts[0] || '';
                const lastName = parts.slice(1).join(' ') || '';
                cvStore.setPersonalBulk({ firstName, lastName });
                break;
            }
            case 'title':
                cvStore.setPersonal('title', value);
                break;
            case 'email':
                cvStore.setPersonal('email', value);
                break;
            case 'phone':
                cvStore.setPersonal('phone', value);
                break;
            case 'location':
                cvStore.setPersonal('location', value);
                break;
            case 'summary':
                cvStore.setSummary(value);
                break;
            case 'exp_title':
                this.tempExp = { title: value, company: '', date: '', description: '' };
                break;
            case 'exp_company':
                this.tempExp.company = value;
                break;
            case 'exp_date':
                this.tempExp.date = value;
                break;
            case 'exp_description':
                this.tempExp.description = value;
                cvStore.addExperience({ ...this.tempExp });
                this.tempExp = {};
                break;
            case 'edu_degree':
                this.tempEdu = { degree: value, school: '', date: '' };
                break;
            case 'edu_school':
                this.tempEdu.school = value;
                break;
            case 'edu_date':
                this.tempEdu.date = value;
                cvStore.addEducation({ ...this.tempEdu });
                this.tempEdu = {};
                break;
            // Certifications
            case 'cert_name':
                this.tempCert = { name: value, issuer: '', date: '' };
                break;
            case 'cert_issuer':
                this.tempCert.issuer = value;
                break;
            case 'cert_date':
                this.tempCert.date = value;
                cvStore.addCertification({ ...this.tempCert });
                this.tempCert = {};
                break;
            // Projects
            case 'project_name':
                this.tempProject = { name: value, description: '', technologies: '' };
                break;
            case 'project_description':
                this.tempProject.description = value;
                break;
            case 'project_tech':
                this.tempProject.technologies = value;
                cvStore.addProject({ ...this.tempProject });
                this.tempProject = {};
                break;
            // Hobbies
            case 'hobbies':
                const hobbies = value.split(',').map(h => h.trim()).filter(Boolean);
                cvStore.setHobbies(hobbies);
                break;
        }
    }

    // ==========================================
    // PASSTHROUGH / BASIC / CHOICE HANDLERS
    // ==========================================

    handlePassthrough(step, value) {
        const skipWord = this.t?.skip || 'skip';
        if (step.field === 'phone' && value.toLowerCase() === skipWord.toLowerCase()) {
            this.advance();
            return;
        }
        this.saveToStore(step, value);
        this.advance();
    }

    handleBasicFormat(step, value) {
        // Simple capitalize for names, pass through for others
        let formatted = value;
        if (step.field === 'fullName') {
            formatted = value.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }
        this.saveToStore(step, formatted);
        this.advance();
    }

    handleChoice(step, value) {
        const yesWords = ['yes', 'po', 'evet', 'نعم', 'да', 'si', 'sim', 'tak', 'ναι'];
        const isYes = yesWords.some(w => value.toLowerCase().includes(w)) ||
            (this.t?.exp_more_yes && value.toLowerCase().includes(this.t.exp_more_yes.toLowerCase().split(',')[0]));

        if (step.field === 'exp_more') {
            if (isYes) {
                const idx = this.steps.findIndex(s => s.id === 'experience_intro');
                this.currentStep = idx;
                this.steps[idx].messages = [this.t?.exp_repeat || "Job title?"];
                delete this.steps[idx].sectionLabel;
                this.showCurrentStep();
            } else {
                this.advance();
            }
        } else if (step.field === 'edu_more') {
            if (isYes) {
                const idx = this.steps.findIndex(s => s.id === 'education_intro');
                this.currentStep = idx;
                this.steps[idx].messages = [this.t?.edu_repeat || "Degree?"];
                delete this.steps[idx].sectionLabel;
                this.showCurrentStep();
            } else {
                this.advance();
            }
        } else if (step.field === 'cert_more') {
            if (isYes) {
                const idx = this.steps.findIndex(s => s.id === 'cert_intro');
                this.currentStep = idx;
                this.steps[idx].messages = [this.t?.cert_repeat || "Certification name?"];
                delete this.steps[idx].sectionLabel;
                this.showCurrentStep();
            } else {
                this.advance();
            }
        } else if (step.field === 'project_more') {
            if (isYes) {
                const idx = this.steps.findIndex(s => s.id === 'project_intro');
                this.currentStep = idx;
                this.steps[idx].messages = [this.t?.project_repeat || "Project name?"];
                delete this.steps[idx].sectionLabel;
                this.showCurrentStep();
            } else {
                this.advance();
            }
        }
    }

    async handleSkills(value) {
        // Check if user wants AI suggestions
        const lowerValue = value.toLowerCase().trim();
        const wantsSuggestions = ['suggest', 'help', 'vorschlagen', 'hilfe', 'ai', 'recommend'].some(k => lowerValue.includes(k));
        
        if (wantsSuggestions && hasApiKey()) {
            await this.suggestSkillsBasedOnJob();
            return;
        }

        if (!hasApiKey()) {
            const skills = value.split(',').map(s => s.trim()).filter(Boolean);
            cvStore.setSkills(skills);
            this.advance();
            return;
        }

        this.chatInput.disabled = true;
        document.getElementById('btn-send').disabled = true;
        const enhancing = this.showEnhancingIndicator();

        try {
            const result = await enhanceContent(value, 'skills', this.lang, this.langName);
            enhancing.remove();

            // Parse the German skills
            const germanSkills = result.german.split(',').map(s => s.trim()).filter(Boolean);

            this.pendingConfirm = {
                step: this.steps[this.currentStep],
                originalInput: value,
                germanText: result.german,
                parsedSkills: germanSkills,
            };

            this.showConfirmation(this.steps[this.currentStep], value, result.german, result.explanation);

            // Override the confirm handler for skills
            const origConfirm = this.confirmEnhanced.bind(this);
            this.confirmEnhanced = (confirmBlock) => {
                if (!this.pendingConfirm) return;
                confirmBlock.classList.add('confirmed');
                const actions = confirmBlock.querySelector('.confirm-actions');
                if (actions) actions.innerHTML = '<span class="confirm-done">✅ Confirmed</span>';
                cvStore.setSkills(this.pendingConfirm.parsedSkills || germanSkills);
                this.pendingConfirm = null;
                this.confirmEnhanced = origConfirm;
                this.advance();
            };
        } catch (error) {
            enhancing.remove();
            const skills = value.split(',').map(s => s.trim()).filter(Boolean);
            cvStore.setSkills(skills);
            this.advance();
        }
    }

    async handleHobbies(value) {
        const skipWord = this.t?.skip || 'skip';
        if (value.toLowerCase() === skipWord.toLowerCase()) {
            this.advance();
            return;
        }
        
        // Enhance hobbies with AI (fix grammar, capitalize properly)
        this.chatInput.disabled = true;
        document.getElementById('btn-send').disabled = true;
        const enhancing = this.showEnhancingIndicator();
        
        try {
            const result = await enhanceContentSecure(
                value,
                'hobbies',
                this.lang,
                this.langName,
                {}
            );
            enhancing.remove();
            
            // Parse comma-separated hobbies from enhanced text
            const enhanced = result.german || result;
            const hobbies = enhanced.split(',').map(h => h.trim()).filter(Boolean);
            cvStore.setHobbies(hobbies);
            
            this.chatInput.disabled = false;
            document.getElementById('btn-send').disabled = false;
            this.advance();
        } catch (error) {
            enhancing.remove();
            console.error('Hobbies enhancement failed:', error);
            // Fallback: save as-is
            const hobbies = value.split(',').map(h => h.trim()).filter(Boolean);
            cvStore.setHobbies(hobbies);
            this.chatInput.disabled = false;
            document.getElementById('btn-send').disabled = false;
            this.advance();
        }
    }

    async generateSummaryAI() {
        const personal = cvStore.getPersonal();
        const jobTitle = personal.title || '';
        
        this.chatInput.disabled = true;
        document.getElementById('btn-send').disabled = true;
        const enhancing = this.showEnhancingIndicator();

        try {
            const content = await generateSummary(jobTitle, this.langName);
            enhancing.remove();

            // Show confirmation with the generated summary
            const step = this.steps[this.currentStep];
            this.pendingConfirm = {
                step: step,
                originalInput: content.german,
                germanText: content.german,
            };
            this.showConfirmation(step, this.t?.btn_help_summary || 'AI Generated', content.german, content.explanation);

        } catch (error) {
            enhancing.remove();
            console.error('Summary generation failed:', error);
            this.addMessage(`⚠️ Could not generate summary. Please write your own.`, 'ai');
            this.chatInput.disabled = false;
            document.getElementById('btn-send').disabled = false;
        }
    }

    async generateJobDescriptionAI() {
        const personal = cvStore.getPersonal();
        const experience = cvStore.getExperience();
        const currentExp = experience[experience.length - 1] || {};
        const jobTitle = currentExp.title || personal.title || '';
        const company = currentExp.company || '';
        
        this.chatInput.disabled = true;
        document.getElementById('btn-send').disabled = true;
        const enhancing = this.showEnhancingIndicator();

        try {
            const content = await generateJobDescription(jobTitle, company, this.langName);
            enhancing.remove();

            // Show confirmation with the generated description
            const step = this.steps[this.currentStep];
            this.pendingConfirm = {
                step: step,
                originalInput: content.german,
                germanText: content.german,
            };
            this.showConfirmation(step, this.t?.btn_help_description || 'AI Generated', content.german, content.explanation);

        } catch (error) {
            enhancing.remove();
            console.error('Description generation failed:', error);
            this.addMessage(`⚠️ Could not generate description. Please write your own.`, 'ai');
            this.chatInput.disabled = false;
            document.getElementById('btn-send').disabled = false;
        }
    }

    async generateProjectDescriptionAI() {
        const projectName = this.tempProject?.name || '';
        const jobTitle = cvStore.getPersonal().title || '';
        
        this.chatInput.disabled = true;
        document.getElementById('btn-send').disabled = true;
        const enhancing = this.showEnhancingIndicator();

        try {
            const content = await generateProjectDescription(projectName, jobTitle, this.langName);
            enhancing.remove();

            // Show confirmation with the generated description
            const step = this.steps[this.currentStep];
            this.pendingConfirm = {
                step: step,
                originalInput: content.german,
                germanText: content.german,
            };
            this.showConfirmation(step, this.t?.btn_help_description || 'AI Generated', content.german, content.explanation);

        } catch (error) {
            enhancing.remove();
            console.error('Project description generation failed:', error);
            this.addMessage(`⚠️ Could not generate description. Please write your own.`, 'ai');
            this.chatInput.disabled = false;
            document.getElementById('btn-send').disabled = false;
        }
    }

    async suggestSkillsBasedOnJob() {
        const jobTitle = cvStore.getPersonal().title || '';
        
        this.chatInput.disabled = true;
        document.getElementById('btn-send').disabled = true;
        const enhancing = this.showEnhancingIndicator();

        try {
            const result = await this.getSkillSuggestionsAI(jobTitle);
            enhancing.remove();

            // Show skill checkboxes
            this.showSkillCheckboxes(result.skills, result.explanation);
        } catch (error) {
            enhancing.remove();
            this.addMessage(`⚠️ Could not generate suggestions. Please type your skills manually.`, 'ai');
            this.chatInput.disabled = false;
            document.getElementById('btn-send').disabled = false;
        }
    }

    async getSkillSuggestionsAI(jobTitle) {
        const skills = await getSkillSuggestionsSecure(jobTitle);
        return { skills, explanation: '' };
    }

    showSkillCheckboxes(skills, explanation) {
        const container = document.createElement('div');
        container.className = 'skill-suggestions';
        container.innerHTML = `
            <div class="skill-header">
                <span class="skill-icon">💡</span>
                <span>${this.t?.skill_suggestions_title || 'Suggested skills for your profession:'}</span>
            </div>
            ${explanation ? `<p class="skill-explanation">${this.escapeHtml(explanation)}</p>` : ''}
            <div class="skill-checkboxes">
                ${skills.map((skill, i) => `
                    <label class="skill-checkbox">
                        <input type="checkbox" value="${this.escapeHtml(skill)}" checked>
                        <span>${this.escapeHtml(skill)}</span>
                    </label>
                `).join('')}
            </div>
            <div class="skill-actions">
                <button class="btn btn-confirm" id="btn-confirm-skills">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ${this.t?.btn_use_selected || 'Use selected'}
                </button>
                <button class="btn btn-edit" id="btn-add-custom-skill">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    ${this.t?.btn_add_custom || 'Add custom'}
                </button>
            </div>
        `;

        this.chatMessages.appendChild(container);
        this.scrollToBottom();

        // Confirm selected skills
        container.querySelector('#btn-confirm-skills').addEventListener('click', () => {
            const checked = container.querySelectorAll('input[type="checkbox"]:checked');
            const selectedSkills = Array.from(checked).map(cb => cb.value);
            
            container.classList.add('confirmed');
            container.querySelector('.skill-actions').innerHTML = '<span class="confirm-done">✅ Skills added</span>';
            
            cvStore.setSkills(selectedSkills);
            this.chatInput.disabled = false;
            document.getElementById('btn-send').disabled = false;
            this.advance();
        });

        // Add custom skill
        container.querySelector('#btn-add-custom-skill').addEventListener('click', () => {
            this.chatInput.disabled = false;
            document.getElementById('btn-send').disabled = false;
            this.chatInput.placeholder = this.t?.placeholder_skills || 'Type additional skills...';
            this.chatInput.focus();
            
            // Mark suggestions as used but allow adding more
            container.querySelector('.skill-actions').innerHTML = `
                <span class="skill-note">✏️ Type your skills below, then press Enter</span>
            `;
        });
    }

    async handleLanguages(value) {
        // Check if user wants interactive picker
        const lowerValue = value.toLowerCase().trim();
        const wantsPicker = ['pick', 'select', 'choose', 'auswählen', 'help', 'hilfe'].some(k => lowerValue.includes(k));
        
        if (wantsPicker) {
            this.showLanguagePicker();
            return;
        }

        // Parse text input with AI translation
        await this.parseAndSaveLanguages(value);
        this.advance();
    }

    showLanguagePicker() {
        const commonLanguages = [
            { name: 'Deutsch', nameLocal: 'German' },
            { name: 'Englisch', nameLocal: 'English' },
            { name: 'Französisch', nameLocal: 'French' },
            { name: 'Spanisch', nameLocal: 'Spanish' },
            { name: 'Italienisch', nameLocal: 'Italian' },
            { name: 'Türkisch', nameLocal: 'Turkish' },
            { name: 'Arabisch', nameLocal: 'Arabic' },
            { name: 'Russisch', nameLocal: 'Russian' },
            { name: 'Polnisch', nameLocal: 'Polish' },
            { name: 'Ukrainisch', nameLocal: 'Ukrainian' },
            { name: 'Albanisch', nameLocal: 'Albanian' },
            { name: 'Serbisch', nameLocal: 'Serbian' },
            { name: 'Kroatisch', nameLocal: 'Croatian' },
            { name: 'Rumänisch', nameLocal: 'Romanian' },
            { name: 'Griechisch', nameLocal: 'Greek' },
            { name: 'Portugiesisch', nameLocal: 'Portuguese' },
        ];

        const levels = [
            { value: 'Muttersprache', label: 'Native', labelDe: 'Muttersprache' },
            { value: 'Fließend', label: 'Fluent', labelDe: 'Fließend (C1-C2)' },
            { value: 'Gute Kenntnisse', label: 'Good', labelDe: 'Gute Kenntnisse (B1-B2)' },
            { value: 'Grundkenntnisse', label: 'Basic', labelDe: 'Grundkenntnisse (A1-A2)' },
        ];

        const container = document.createElement('div');
        container.className = 'language-picker';
        container.innerHTML = `
            <div class="picker-header">
                <span class="picker-icon">🌍</span>
                <span>${this.t?.language_picker_title || 'Select your languages and proficiency levels:'}</span>
            </div>
            <div class="language-list" id="language-list">
                ${commonLanguages.map(lang => `
                    <div class="language-row" data-lang="${lang.name}">
                        <label class="language-check">
                            <input type="checkbox" value="${lang.name}">
                            <span class="lang-name">${lang.name}</span>
                            <span class="lang-local">${lang.nameLocal}</span>
                        </label>
                        <select class="level-select" disabled>
                            ${levels.map(l => `<option value="${l.value}">${l.labelDe}</option>`).join('')}
                        </select>
                    </div>
                `).join('')}
            </div>
            <div class="picker-actions">
                <button class="btn btn-confirm" id="btn-confirm-languages" disabled>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ${this.t?.btn_confirm_languages || 'Add selected languages'}
                </button>
            </div>
        `;

        this.chatMessages.appendChild(container);
        this.scrollToBottom();

        // Enable level select when checkbox is checked
        container.querySelectorAll('.language-row').forEach(row => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            const select = row.querySelector('.level-select');
            
            checkbox.addEventListener('change', () => {
                select.disabled = !checkbox.checked;
                if (checkbox.checked) {
                    row.classList.add('selected');
                } else {
                    row.classList.remove('selected');
                }
                
                // Enable/disable confirm button
                const anyChecked = container.querySelectorAll('input[type="checkbox"]:checked').length > 0;
                container.querySelector('#btn-confirm-languages').disabled = !anyChecked;
            });
        });

        // Confirm button
        container.querySelector('#btn-confirm-languages').addEventListener('click', () => {
            const selectedLangs = [];
            container.querySelectorAll('.language-row').forEach(row => {
                const checkbox = row.querySelector('input[type="checkbox"]');
                const select = row.querySelector('.level-select');
                
                if (checkbox.checked) {
                    selectedLangs.push({
                        name: checkbox.value,
                        level: select.value
                    });
                }
            });

            // Save to store
            selectedLangs.forEach(lang => cvStore.addLanguage(lang));

            // Mark as confirmed
            container.classList.add('confirmed');
            container.querySelector('.picker-actions').innerHTML = `
                <span class="confirm-done">✅ ${selectedLangs.length} language(s) added</span>
            `;

            this.chatInput.disabled = false;
            document.getElementById('btn-send').disabled = false;
            this.advance();
        });

        // Disable text input while picker is active
        this.chatInput.disabled = true;
        document.getElementById('btn-send').disabled = true;
    }

    async parseAndSaveLanguages(value) {
        // Use AI to translate language names to German
        const indicator = this.showEnhancingIndicator();
        
        try {
            const result = await enhanceContentSecure(value, 'languages', this.selectedLang?.code || 'en', this.selectedLang?.name || 'English', {});
            indicator.remove();
            
            // Parse the German result
            const germanText = result.german || value;
            const langs = germanText.split(',').map(l => l.trim()).filter(Boolean);
            
            langs.forEach(lang => {
                const parts = lang.split('-').map(p => p.trim());
                const name = parts[0] || lang;
                const level = parts[1] || 'Gute Kenntnisse';
                cvStore.addLanguage({ name, level });
            });
            
            // Show confirmation
            if (result.explanation) {
                this.addMessage(result.explanation, 'ai');
            }
        } catch (error) {
            indicator.remove();
            console.error('Language translation error:', error);
            // Fallback: save as-is
            const langs = value.split(',').map(l => l.trim()).filter(Boolean);
            langs.forEach(lang => {
                const parts = lang.split('-').map(p => p.trim());
                const name = parts[0] || lang;
                const level = parts[1] || 'Gute Kenntnisse';
                cvStore.addLanguage({ name, level });
            });
        }
    }

    advance() {
        this.currentStep++;
        setTimeout(() => this.showCurrentStep(), 600);
    }

    // ==========================================
    // UI HELPERS
    // ==========================================

    showEnhancingIndicator() {
        const el = document.createElement('div');
        el.className = 'enhancing-indicator';
        el.innerHTML = `
      <div class="enhancing-spinner"></div>
      <span>Enhancing for your CV...</span>
    `;
        this.chatMessages.appendChild(el);
        this.scrollToBottom();
        return el;
    }

    addMessage(text, sender) {
        const msg = document.createElement('div');
        msg.className = `message ${sender}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = sender === 'ai'
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M16 14H8a4 4 0 0 0-4 4v2h16v-2a4 4 0 0 0-4-4z"/></svg>'
            : '👤';

        const content = document.createElement('div');
        content.className = 'message-content';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.innerHTML = this.formatText(text);

        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        content.appendChild(bubble);
        content.appendChild(time);
        msg.appendChild(avatar);
        msg.appendChild(content);
        this.chatMessages.appendChild(msg);
        this.scrollToBottom();
    }

    formatText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }

    async showTypingThenMessage(text) {
        const personal = cvStore.getPersonal();
        let processedText = text
            .replace('{firstName}', personal.firstName || '...')
            .replace('{lastName}', personal.lastName || '');

        const typing = document.createElement('div');
        typing.className = 'typing-indicator';
        typing.innerHTML = `
      <div class="message-avatar" style="background: var(--accent-gradient); color: white; width: 28px; height: 28px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M16 14H8a4 4 0 0 0-4 4v2h16v-2a4 4 0 0 0-4-4z"/></svg>
      </div>
      <div class="typing-bubble">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
        this.chatMessages.appendChild(typing);
        this.scrollToBottom();

        await this.delay(800 + Math.random() * 600);

        typing.remove();
        this.addMessage(processedText, 'ai');
    }

    showSuggestions(suggestions) {
        this.chatSuggestions.innerHTML = '';
        suggestions.forEach(s => {
            if (!s) return;
            const chip = document.createElement('button');
            chip.className = 'suggestion-chip';
            chip.textContent = s;
            chip.addEventListener('click', () => {
                this.chatInput.value = s;
                this.handleUserInput();
            });
            this.chatSuggestions.appendChild(chip);
        });
    }

    addSectionDivider(label) {
        const divider = document.createElement('div');
        divider.className = 'chat-section-divider';
        divider.innerHTML = `<span>${label}</span>`;
        this.chatMessages.appendChild(divider);
    }

    updateProgress() {
        const old = this.chatMessages.querySelector('.chat-progress');
        if (old) old.remove();

        const totalSteps = this.steps.filter(s => s.field !== null).length;
        const completedSteps = Math.min(this.currentStep, totalSteps);
        const pct = Math.round((completedSteps / totalSteps) * 100);

        if (pct > 0 && pct < 100) {
            const progress = document.createElement('div');
            progress.className = 'chat-progress';
            progress.innerHTML = `
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${pct}%"></div>
        </div>
        <span class="progress-text">${pct}%</span>
      `;
            this.chatMessages.appendChild(progress);
        }
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

export default ChatEngine;
