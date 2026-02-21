/**
 * CV Editor — Renders editable CV sections and live preview
 */

import cvStore from './cvData.js';
import { hasApiKey } from './openai.js';
import { callOpenAI, aiEdit } from './services/aiService.js';
import { isSupabaseConfigured } from './lib/supabase.js';

// Color palette for accent colors
const COLOR_MAP = {
  emerald: { primary: '#059669', light: '#d1fae5', dark: '#065f46', gradient: 'linear-gradient(135deg, #059669, #10b981)' },
  blue: { primary: '#2563eb', light: '#dbeafe', dark: '#1e40af', gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)' },
  purple: { primary: '#7c3aed', light: '#ede9fe', dark: '#5b21b6', gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)' },
  rose: { primary: '#e11d48', light: '#ffe4e6', dark: '#9f1239', gradient: 'linear-gradient(135deg, #e11d48, #f43f5e)' },
  orange: { primary: '#ea580c', light: '#ffedd5', dark: '#c2410c', gradient: 'linear-gradient(135deg, #ea580c, #f97316)' },
  slate: { primary: '#475569', light: '#f1f5f9', dark: '#1e293b', gradient: 'linear-gradient(135deg, #475569, #64748b)' },
  teal: { primary: '#0d9488', light: '#ccfbf1', dark: '#115e59', gradient: 'linear-gradient(135deg, #0d9488, #14b8a6)' },
  indigo: { primary: '#4f46e5', light: '#e0e7ff', dark: '#3730a3', gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)' },
};

export class CVEditor {
  constructor() {
    this.editorContent = document.getElementById('editor-content');
    this.cvDocument = document.getElementById('cv-document');
    this.editorEmpty = document.getElementById('editor-empty');
    this.previewContent = document.getElementById('preview-content');
    this.previewPage = document.getElementById('cv-preview-page');
    this.tabEdit = document.getElementById('tab-edit');
    this.tabPreview = document.getElementById('tab-preview');
    this.btnExport = document.getElementById('btn-export-pdf');

    this.activeTab = 'edit';
    this.hasContent = false;

    this.init();
  }

  init() {
    // Listen for data changes
    cvStore.on('personal', () => this.renderPersonal());
    cvStore.on('summary', () => this.renderSummary());
    cvStore.on('experience', () => this.renderExperience());
    cvStore.on('education', () => this.renderEducation());
    cvStore.on('skills', () => this.renderSkills());
    cvStore.on('languages', () => this.renderLanguages());
    cvStore.on('certifications', () => this.renderCertifications());
    cvStore.on('projects', () => this.renderProjects());
    cvStore.on('hobbies', () => this.renderHobbies());
    cvStore.on('accentColor', () => this.updatePreview());
    cvStore.on('reset', () => this.handleReset());
    cvStore.on('*', () => this.updatePreview());

    // Tab switching
    this.tabEdit.addEventListener('click', () => this.switchTab('edit'));
    this.tabPreview.addEventListener('click', () => this.switchTab('preview'));

    // PDF Export
    this.btnExport.addEventListener('click', () => this.exportPDF());
  }

  showDocument() {
    if (!this.hasContent) {
      this.hasContent = true;
      this.editorEmpty.style.display = 'none';
      this.cvDocument.style.display = 'flex';
    }
  }

  handleReset() {
    this.hasContent = false;
    this.cvDocument.innerHTML = '';
    this.cvDocument.style.display = 'none';
    this.editorEmpty.style.display = 'flex';
    this.previewPage.innerHTML = '';
  }

  switchTab(tab) {
    this.activeTab = tab;
    this.tabEdit.classList.toggle('active', tab === 'edit');
    this.tabPreview.classList.toggle('active', tab === 'preview');
    this.editorContent.style.display = tab === 'edit' ? 'block' : 'none';
    this.previewContent.style.display = tab === 'preview' ? 'flex' : 'none';
    if (tab === 'preview') {
      this.updatePreview();
    } else if (tab === 'edit') {
      // Re-render all sections to ensure they're up to date
      this.renderAllSections();
    }
  }

  renderAllSections() {
    const data = cvStore.getData();
    if (data.personal.firstName || data.personal.lastName || data.personal.email) {
      this.renderPersonal();
    }
    if (data.summary) {
      this.renderSummary();
    }
    if (data.experience.length > 0) {
      this.renderExperience();
    }
    if (data.education.length > 0) {
      this.renderEducation();
    }
    if (data.skills.length > 0) {
      this.renderSkills();
    }
    if (data.languages.length > 0) {
      this.renderLanguages();
    }
    if (data.certifications?.length > 0) {
      this.renderCertifications();
    }
    if (data.projects?.length > 0) {
      this.renderProjects();
    }
    if (data.hobbies?.length > 0) {
      this.renderHobbies();
    }
  }

  // ==========================================
  // PERSONAL INFO
  // ==========================================

  renderPersonal() {
    this.showDocument();
    let section = this.cvDocument.querySelector('[data-section="personal"]');

    const data = cvStore.getPersonal();
    const initials = (data.firstName?.[0] || '') + (data.lastName?.[0] || '');
    const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ');
    const hasPhoto = data.photo && data.photo.length > 0;

    if (!section) {
      section = this.createSection('personal', 'Persönliche Daten',
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
        true
      );
      this.cvDocument.prepend(section);
    }

    const body = section.querySelector('.cv-section-body') || section;
    body.innerHTML = `
      <div class="personal-header">
        <div class="personal-avatar-wrapper">
          ${hasPhoto 
            ? `<img src="${data.photo}" alt="Profile" class="personal-photo">`
            : `<div class="personal-avatar">${initials || '?'}</div>`
          }
          <label class="photo-upload-btn" title="Upload photo">
            <input type="file" accept="image/*" id="photo-upload" hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </label>
          ${hasPhoto ? `<button class="photo-remove-btn" id="photo-remove" title="Remove photo">×</button>` : ''}
        </div>
        <div class="personal-info">
          <div class="personal-name editable-field" contenteditable="true" data-field="fullName" data-placeholder="Your Name">${this.escapeHtml(fullName)}</div>
          <div class="personal-title editable-field" contenteditable="true" data-field="title" data-placeholder="Professional Title">${this.escapeHtml(data.title)}</div>
          <div class="personal-details">
            ${data.email ? `<span class="personal-detail"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg><span class="editable-field" contenteditable="true" data-field="email" data-placeholder="email">${this.escapeHtml(data.email)}</span></span>` : ''}
            ${data.phone ? `<span class="personal-detail"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span class="editable-field" contenteditable="true" data-field="phone" data-placeholder="phone">${this.escapeHtml(data.phone)}</span></span>` : ''}
            ${data.location ? `<span class="personal-detail"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg><span class="editable-field" contenteditable="true" data-field="location" data-placeholder="location">${this.escapeHtml(data.location)}</span></span>` : ''}
          </div>
        </div>
      </div>
    `;

    // Photo upload handler
    const photoInput = body.querySelector('#photo-upload');
    if (photoInput) {
      photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
    }

    // Photo remove handler
    const removeBtn = body.querySelector('#photo-remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        cvStore.setPersonal('photo', '');
      });
    }

    // Add edit listeners
    this.attachEditableListeners(section, 'personal');
  }

  handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be smaller than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      // Resize image to reasonable dimensions
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        cvStore.setPersonal('photo', resizedDataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ==========================================
  // SUMMARY
  // ==========================================

  renderSummary() {
    this.showDocument();
    let section = this.cvDocument.querySelector('[data-section="summary"]');

    if (!section) {
      section = this.createSection('summary', 'Berufliches Profil',
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>'
      );
      // Insert after personal
      const personal = this.cvDocument.querySelector('[data-section="personal"]');
      if (personal) {
        personal.after(section);
      } else {
        this.cvDocument.prepend(section);
      }
    }

    const body = section.querySelector('.cv-section-body');
    body.innerHTML = `
      <div class="cv-summary-text editable-field" contenteditable="true" data-field="summary" data-placeholder="Write your professional summary...">${this.escapeHtml(cvStore.getSummary())}</div>
    `;

    this.attachEditableListeners(section, 'summary');
  }

  // ==========================================
  // EXPERIENCE
  // ==========================================

  renderExperience() {
    this.showDocument();
    let section = this.cvDocument.querySelector('[data-section="experience"]');
    const entries = cvStore.getExperience();

    if (!section) {
      section = this.createSection('experience', 'Berufserfahrung',
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>'
      );
      this.insertSectionInOrder(section, 'experience');
    }

    const body = section.querySelector('.cv-section-body');
    const showAiButton = hasApiKey();
    body.innerHTML = entries.map(entry => `
      <div class="cv-entry" data-entry-id="${entry.id}">
        <div class="cv-entry-toolbar">
          <span class="cv-entry-date editable-field" contenteditable="true" data-field="date" data-entry-id="${entry.id}" data-placeholder="Date">${this.escapeHtml(entry.date)}</span>
          <div class="cv-entry-actions">
            ${showAiButton ? `
              <button class="btn-ai-edit" data-ai-exp="${entry.id}" title="AI Help">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
                  <path d="M16 14H8a4 4 0 0 0-4 4v2h16v-2a4 4 0 0 0-4-4z"/>
                </svg>
                <span>AI</span>
              </button>
            ` : ''}
            <button class="btn btn-danger btn-sm" data-remove-exp="${entry.id}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
        <div class="cv-entry-header">
          <div>
            <div class="cv-entry-title editable-field" contenteditable="true" data-field="title" data-entry-id="${entry.id}" data-placeholder="Job Title">${this.escapeHtml(entry.title)}</div>
            <div class="cv-entry-company editable-field" contenteditable="true" data-field="company" data-entry-id="${entry.id}" data-placeholder="Company">${this.escapeHtml(entry.company)}</div>
          </div>
        </div>
        <div class="cv-entry-description editable-field" contenteditable="true" data-field="description" data-entry-id="${entry.id}" data-placeholder="Describe your responsibilities...">${this.escapeHtml(entry.description)}</div>
      </div>
    `).join('');

    // Add "add" button
    body.innerHTML += `
      <button class="add-entry-btn" id="add-experience-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Hinzufügen
      </button>
    `;

    // Attach listeners
    body.querySelectorAll('[data-remove-exp]').forEach(btn => {
      btn.addEventListener('click', () => {
        cvStore.removeExperience(btn.dataset.removeExp);
      });
    });

    // AI edit buttons for experience descriptions
    body.querySelectorAll('[data-ai-exp]').forEach(btn => {
      btn.addEventListener('click', () => {
        const entryId = btn.dataset.aiExp;
        const entry = entries.find(e => e.id === entryId);
        // Check if entry is completely new (no title, company, description)
        const isNewEntry = !entry?.title && !entry?.company && !entry?.description;
        
        if (isNewEntry) {
          // Open guided wizard for new job entry
          this.openNewJobWizard(entryId);
        } else {
          // Check if just description is empty
          const isEmpty = !entry?.description || entry.description.trim() === '';
          this.openAiEditModal('experience', entryId, isEmpty);
        }
      });
    });

    const addBtn = body.querySelector('#add-experience-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        cvStore.addExperience({ title: '', company: '', date: '', description: '' });
      });
    }

    this.attachEntryEditableListeners(section, 'experience');
  }

  // ==========================================
  // EDUCATION
  // ==========================================

  renderEducation() {
    this.showDocument();
    let section = this.cvDocument.querySelector('[data-section="education"]');
    const entries = cvStore.getEducation();

    if (!section) {
      section = this.createSection('education', 'Ausbildung',
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5"></path></svg>'
      );
      this.insertSectionInOrder(section, 'education');
    }

    const body = section.querySelector('.cv-section-body');
    body.innerHTML = entries.map(entry => `
      <div class="cv-entry" data-entry-id="${entry.id}">
        <div class="cv-entry-header">
          <div>
            <div class="cv-entry-title editable-field" contenteditable="true" data-field="degree" data-entry-id="${entry.id}" data-placeholder="Degree">${this.escapeHtml(entry.degree)}</div>
            <div class="cv-entry-company editable-field" contenteditable="true" data-field="school" data-entry-id="${entry.id}" data-placeholder="School">${this.escapeHtml(entry.school)}</div>
          </div>
          <span class="cv-entry-date editable-field" contenteditable="true" data-field="date" data-entry-id="${entry.id}" data-placeholder="Date">${this.escapeHtml(entry.date)}</span>
        </div>
        <div class="cv-entry-actions">
          <button class="btn btn-danger btn-sm" data-remove-edu="${entry.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Remove
          </button>
        </div>
      </div>
    `).join('');

    body.innerHTML += `
      <button class="add-entry-btn" id="add-education-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Hinzufügen
      </button>
    `;

    body.querySelectorAll('[data-remove-edu]').forEach(btn => {
      btn.addEventListener('click', () => {
        cvStore.removeEducation(btn.dataset.removeEdu);
      });
    });

    const addBtn = body.querySelector('#add-education-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        cvStore.addEducation({ degree: '', school: '', date: '' });
      });
    }

    this.attachEntryEditableListeners(section, 'education');
  }

  // ==========================================
  // SKILLS
  // ==========================================

  renderSkills() {
    this.showDocument();
    let section = this.cvDocument.querySelector('[data-section="skills"]');
    const skills = cvStore.getSkills();

    if (!section) {
      section = this.createSection('skills', 'Fähigkeiten',
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'
      );
      this.insertSectionInOrder(section, 'skills');
    }

    const body = section.querySelector('.cv-section-body');
    body.innerHTML = `
      <div class="skills-grid">
        ${skills.map(skill => `
          <span class="skill-tag">
            ${this.escapeHtml(skill)}
            <button class="skill-remove" data-remove-skill="${this.escapeHtml(skill)}">&times;</button>
          </span>
        `).join('')}
        <span class="skill-add-input">
          <input type="text" placeholder="+ Add skill" id="add-skill-input" />
        </span>
      </div>
    `;

    body.querySelectorAll('[data-remove-skill]').forEach(btn => {
      btn.addEventListener('click', () => {
        cvStore.removeSkill(btn.dataset.removeSkill);
      });
    });

    const addInput = body.querySelector('#add-skill-input');
    if (addInput) {
      addInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = addInput.value.trim();
          if (val) {
            // Support comma-separated
            val.split(',').map(s => s.trim()).filter(Boolean).forEach(s => cvStore.addSkill(s));
            addInput.value = '';
          }
        }
      });
    }
  }

  // ==========================================
  // LANGUAGES
  // ==========================================

  renderLanguages() {
    this.showDocument();
    let section = this.cvDocument.querySelector('[data-section="languages"]');
    const langs = cvStore.getLanguages();

    if (!section) {
      section = this.createSection('languages', 'Sprachen',
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>'
      );
      this.insertSectionInOrder(section, 'languages');
    }

    const languageOptions = [
      'Deutsch', 'Englisch', 'Französisch', 'Spanisch', 'Italienisch',
      'Türkisch', 'Arabisch', 'Russisch', 'Polnisch', 'Ukrainisch',
      'Albanisch', 'Serbisch', 'Kroatisch', 'Rumänisch', 'Griechisch',
      'Portugiesisch', 'Niederländisch', 'Chinesisch', 'Japanisch', 'Koreanisch'
    ];

    const levelOptions = [
      { value: 'Muttersprache', label: 'Muttersprache (Native)' },
      { value: 'Fließend', label: 'Fließend (C1-C2)' },
      { value: 'Gute Kenntnisse', label: 'Gute Kenntnisse (B1-B2)' },
      { value: 'Grundkenntnisse', label: 'Grundkenntnisse (A1-A2)' },
    ];

    const body = section.querySelector('.cv-section-body');
    body.innerHTML = langs.map(lang => {
      const dots = this.getLevelDots(lang.level);
      return `
        <div class="language-item" data-lang-id="${lang.id}">
          <select class="language-select" data-field="name" data-lang-id="${lang.id}">
            <option value="">Select language...</option>
            ${languageOptions.map(opt => `
              <option value="${opt}" ${lang.name === opt ? 'selected' : ''}>${opt}</option>
            `).join('')}
            ${lang.name && !languageOptions.includes(lang.name) ? `<option value="${this.escapeHtml(lang.name)}" selected>${this.escapeHtml(lang.name)}</option>` : ''}
          </select>
          <div class="language-level">
            <select class="level-select" data-field="level" data-lang-id="${lang.id}">
              ${levelOptions.map(opt => `
                <option value="${opt.value}" ${lang.level === opt.value ? 'selected' : ''}>${opt.label}</option>
              `).join('')}
            </select>
            <div class="language-dots">${dots}</div>
            <button class="btn btn-danger btn-sm" data-remove-lang="${lang.id}" style="padding: 4px 6px;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    body.innerHTML += `
      <button class="add-entry-btn" id="add-language-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Hinzufügen
      </button>
    `;

    body.querySelectorAll('[data-remove-lang]').forEach(btn => {
      btn.addEventListener('click', () => {
        cvStore.removeLanguage(btn.dataset.removeLang);
      });
    });

    const addBtn = body.querySelector('#add-language-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        cvStore.addLanguage({ name: '', level: 'Gute Kenntnisse' });
      });
    }

    // Dropdown change listeners for language fields
    section.querySelectorAll('select[data-lang-id]').forEach(el => {
      el.addEventListener('change', () => {
        const langId = el.dataset.langId;
        const field = el.dataset.field;
        cvStore.updateLanguage(langId, { [field]: el.value });
      });
    });
  }

  getLevelDots(level) {
    const levels = {
      'native': 5, 'muttersprache': 5,
      'fluent': 4, 'fließend': 4, 'c2': 4, 'c1': 4, 'fortgeschritten': 4,
      'advanced': 4,
      'intermediate': 3, 'mittelstufe': 3, 'b2': 3, 'b1': 3, 'gute kenntnisse': 3, 'gute mittelstufe': 3,
      'conversational': 2, 'grundkenntnisse': 1, 'a2': 2, 'a1': 1,
      'basic': 1, 'beginner': 1, 'anfänger': 1,
    };
    let count = 2;
    const lowerLevel = level?.toLowerCase() || '';
    for (const [key, val] of Object.entries(levels)) {
      if (lowerLevel.includes(key)) { count = val; break; }
    }
    let html = '';
    for (let i = 0; i < 5; i++) {
      html += `<div class="language-dot ${i < count ? 'filled' : ''}"></div>`;
    }
    return html;
  }

  // ==========================================
  // CERTIFICATIONS
  // ==========================================

  renderCertifications() {
    this.showDocument();
    let section = this.cvDocument.querySelector('[data-section="certifications"]');
    const certs = cvStore.getCertifications();

    if (!section && certs.length > 0) {
      section = this.createSection('certifications', 'Zertifikate',
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>'
      );
      this.insertSectionInOrder(section, 'certifications');
    }

    if (!section) return;

    const body = section.querySelector('.cv-section-body');
    body.innerHTML = certs.map(cert => `
      <div class="cv-entry" data-entry-id="${cert.id}">
        <div class="cv-entry-header">
          <div>
            <div class="cv-entry-title editable-field" contenteditable="true" data-field="name" data-entry-id="${cert.id}" data-placeholder="Certification name">${this.escapeHtml(cert.name || '')}</div>
            <div class="cv-entry-company editable-field" contenteditable="true" data-field="issuer" data-entry-id="${cert.id}" data-placeholder="Issuer">${this.escapeHtml(cert.issuer || '')}</div>
          </div>
          <span class="cv-entry-date editable-field" contenteditable="true" data-field="date" data-entry-id="${cert.id}" data-placeholder="Date">${this.escapeHtml(cert.date || '')}</span>
        </div>
        <div class="cv-entry-actions">
          <button class="btn btn-danger btn-sm" data-remove-cert="${cert.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Remove
          </button>
        </div>
      </div>
    `).join('');

    body.innerHTML += `
      <button class="add-entry-btn" id="add-cert-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Hinzufügen
      </button>
    `;

    body.querySelectorAll('[data-remove-cert]').forEach(btn => {
      btn.addEventListener('click', () => {
        cvStore.removeCertification(btn.dataset.removeCert);
      });
    });

    const addBtn = body.querySelector('#add-cert-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        cvStore.addCertification({ name: '', issuer: '', date: '' });
      });
    }

    this.attachEntryEditableListeners(section, 'certifications');
  }

  // ==========================================
  // PROJECTS
  // ==========================================

  renderProjects() {
    this.showDocument();
    let section = this.cvDocument.querySelector('[data-section="projects"]');
    const projects = cvStore.getProjects();

    if (!section && projects.length > 0) {
      section = this.createSection('projects', 'Projekte',
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>'
      );
      this.insertSectionInOrder(section, 'projects');
    }

    if (!section) return;

    const body = section.querySelector('.cv-section-body');
    body.innerHTML = projects.map(project => `
      <div class="cv-entry" data-entry-id="${project.id}">
        <div class="cv-entry-header">
          <div class="cv-entry-title editable-field" contenteditable="true" data-field="name" data-entry-id="${project.id}" data-placeholder="Project name">${this.escapeHtml(project.name || '')}</div>
        </div>
        <div class="cv-entry-description editable-field" contenteditable="true" data-field="description" data-entry-id="${project.id}" data-placeholder="Project description">${this.escapeHtml(project.description || '')}</div>
        <div class="cv-entry-tech editable-field" contenteditable="true" data-field="technologies" data-entry-id="${project.id}" data-placeholder="Technologies used">${this.escapeHtml(project.technologies || '')}</div>
        <div class="cv-entry-actions">
          <button class="btn btn-danger btn-sm" data-remove-project="${project.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Remove
          </button>
        </div>
      </div>
    `).join('');

    body.innerHTML += `
      <button class="add-entry-btn" id="add-project-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Hinzufügen
      </button>
    `;

    body.querySelectorAll('[data-remove-project]').forEach(btn => {
      btn.addEventListener('click', () => {
        cvStore.removeProject(btn.dataset.removeProject);
      });
    });

    const addBtn = body.querySelector('#add-project-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        cvStore.addProject({ name: '', description: '', technologies: '' });
      });
    }

    this.attachEntryEditableListeners(section, 'projects');
  }

  // ==========================================
  // HOBBIES
  // ==========================================

  renderHobbies() {
    this.showDocument();
    let section = this.cvDocument.querySelector('[data-section="hobbies"]');
    const hobbies = cvStore.getHobbies();

    if (!section && hobbies.length > 0) {
      section = this.createSection('hobbies', 'Hobbys & Interessen',
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
        true
      );
      this.insertSectionInOrder(section, 'hobbies');
    }

    if (!section) return;

    const body = section.querySelector('.cv-section-body');
    body.innerHTML = `
      <div class="skills-grid">
        ${hobbies.map(hobby => `
          <span class="skill-tag hobby-tag">
            ${this.escapeHtml(hobby)}
            <button class="skill-remove" data-remove-hobby="${this.escapeHtml(hobby)}">&times;</button>
          </span>
        `).join('')}
        <span class="skill-add-input">
          <input type="text" placeholder="+ Add hobby" id="add-hobby-input" />
        </span>
      </div>
    `;

    body.querySelectorAll('[data-remove-hobby]').forEach(btn => {
      btn.addEventListener('click', () => {
        cvStore.removeHobby(btn.dataset.removeHobby);
      });
    });

    const addInput = body.querySelector('#add-hobby-input');
    if (addInput) {
      addInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = addInput.value.trim();
          if (val) {
            val.split(',').map(h => h.trim()).filter(Boolean).forEach(h => cvStore.addHobby(h));
            addInput.value = '';
          }
        }
      });
    }
  }

  // ==========================================
  // PREVIEW
  // ==========================================

  updatePreview() {
    if (this.activeTab !== 'preview') return;

    const data = cvStore.getData();
    const templateId = data.templateId || 'modern';
    const accentColor = data.accentColor || 'emerald';
    
    // Generate template-specific HTML
    if (templateId === 'creative') {
      this.previewPage.innerHTML = this.renderCreativeTemplate(data, accentColor);
    } else if (templateId === 'klassisch') {
      this.previewPage.innerHTML = this.renderKlassischTemplate(data, accentColor);
    } else if (templateId === 'kompakt') {
      this.previewPage.innerHTML = this.renderKompaktTemplate(data, accentColor);
    } else if (templateId === 'minimalist') {
      this.previewPage.innerHTML = this.renderMinimalistTemplate(data, accentColor);
    } else if (templateId === 'executive') {
      this.previewPage.innerHTML = this.renderExecutiveTemplate(data, accentColor);
    } else if (templateId === 'tech') {
      this.previewPage.innerHTML = this.renderTechTemplate(data, accentColor);
    } else if (templateId === 'elegant') {
      this.previewPage.innerHTML = this.renderElegantTemplate(data, accentColor);
    } else if (templateId === 'bold') {
      this.previewPage.innerHTML = this.renderBoldTemplate(data, accentColor);
    } else {
      this.previewPage.innerHTML = this.renderStandardTemplate(data, templateId, accentColor);
    }
  }

  renderStandardTemplate(data, templateId) {
    const fullName = [data.personal.firstName, data.personal.lastName].filter(Boolean).join(' ');
    const hasPhoto = data.personal.photo && data.personal.photo.length > 0;
    // Professional template should not show photo
    const showPhoto = hasPhoto && templateId !== 'professional';
    
    return `
      <div class="cv-template cv-template-${templateId}">
        <div class="cv-template-inner">
          <div class="preview-header-row">
            <div class="preview-header-info">
              ${fullName ? `<div class="preview-name">${this.escapeHtml(fullName)}</div>` : ''}
              ${data.personal.title ? `<div class="preview-title">${this.escapeHtml(data.personal.title)}</div>` : ''}
            </div>
            ${showPhoto ? `<img src="${data.personal.photo}" alt="Profile" class="preview-photo">` : ''}
          </div>
          <div class="preview-contact">
            ${data.personal.email ? `<span>📧 ${this.escapeHtml(data.personal.email)}</span>` : ''}
            ${data.personal.phone ? `<span>📱 ${this.escapeHtml(data.personal.phone)}</span>` : ''}
            ${data.personal.location ? `<span>📍 ${this.escapeHtml(data.personal.location)}</span>` : ''}
          </div>

          ${data.summary ? `
            <div class="preview-section">
              <div class="preview-section-title">Berufliches Profil</div>
              <div class="preview-summary">${this.escapeHtml(data.summary)}</div>
            </div>
          ` : ''}

          ${data.experience.length > 0 ? `
            <div class="preview-section">
              <div class="preview-section-title">Berufserfahrung</div>
              ${data.experience.map(e => `
                <div class="preview-entry">
                  <div class="preview-entry-header">
                    <span class="preview-entry-title">${this.escapeHtml(e.title)}</span>
                    <span class="preview-entry-date">${this.escapeHtml(e.date)}</span>
                  </div>
                  ${e.company ? `<div class="preview-entry-company">${this.escapeHtml(e.company)}</div>` : ''}
                  ${e.description ? `<div class="preview-entry-desc">${this.escapeHtml(e.description)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${data.education.length > 0 ? `
            <div class="preview-section">
              <div class="preview-section-title">Ausbildung</div>
              ${data.education.map(e => `
                <div class="preview-entry">
                  <div class="preview-entry-header">
                    <span class="preview-entry-title">${this.escapeHtml(e.degree)}</span>
                    <span class="preview-entry-date">${this.escapeHtml(e.date)}</span>
                  </div>
                  ${e.school ? `<div class="preview-entry-company">${this.escapeHtml(e.school)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${data.skills.length > 0 ? `
            <div class="preview-section">
              <div class="preview-section-title">Fähigkeiten</div>
              <div class="preview-skills">
                ${data.skills.map(s => `<span class="preview-skill">${this.escapeHtml(s)}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          ${data.languages.length > 0 ? `
            <div class="preview-section">
              <div class="preview-section-title">Sprachen</div>
              <div class="preview-languages-list">
              ${data.languages.map(l => `
                <div class="preview-language-item">
                  <span class="preview-language-name">${this.escapeHtml(l.name)}</span>
                  <span class="preview-language-level">${this.escapeHtml(l.level)}</span>
                </div>
              `).join('')}
              </div>
            </div>
          ` : ''}

          ${data.certifications?.length > 0 ? `
            <div class="preview-section">
              <div class="preview-section-title">Zertifikate</div>
              ${data.certifications.map(c => `
                <div class="preview-entry">
                  <div class="preview-entry-header">
                    <span class="preview-entry-title">${this.escapeHtml(c.name)}</span>
                    <span class="preview-entry-date">${this.escapeHtml(c.date || '')}</span>
                  </div>
                  ${c.issuer ? `<div class="preview-entry-company">${this.escapeHtml(c.issuer)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${data.projects?.length > 0 ? `
            <div class="preview-section">
              <div class="preview-section-title">Projekte</div>
              ${data.projects.map(p => `
                <div class="preview-entry">
                  <div class="preview-entry-title">${this.escapeHtml(p.name)}</div>
                  ${p.description ? `<div class="preview-entry-desc">${this.escapeHtml(p.description)}</div>` : ''}
                  ${p.technologies ? `<div class="preview-entry-tech"><em>${this.escapeHtml(p.technologies)}</em></div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${data.hobbies?.length > 0 ? `
            <div class="preview-section">
              <div class="preview-section-title">Hobbys & Interessen</div>
              <div class="preview-skills">
                ${data.hobbies.map(h => `<span class="preview-skill preview-hobby">${this.escapeHtml(h)}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderCreativeTemplate(data) {
    const fullName = [data.personal.firstName, data.personal.lastName].filter(Boolean).join(' ');
    const hasPhoto = data.personal.photo && data.personal.photo.length > 0;
    const initials = (data.personal.firstName?.[0] || '') + (data.personal.lastName?.[0] || '');
    
    return `
      <div class="cv-template cv-template-creative">
        <div class="cv-sidebar">
          <div class="sidebar-header">
            ${hasPhoto 
              ? `<img src="${data.personal.photo}" alt="Profile" class="sidebar-photo">`
              : `<div class="sidebar-avatar">${initials || '?'}</div>`
            }
            ${fullName ? `<div class="preview-name">${this.escapeHtml(fullName)}</div>` : ''}
            ${data.personal.title ? `<div class="preview-title">${this.escapeHtml(data.personal.title)}</div>` : ''}
          </div>
          
          <div class="sidebar-section">
            <div class="preview-section-title">Kontakt</div>
            <div class="preview-contact">
              ${data.personal.email ? `<span>📧 ${this.escapeHtml(data.personal.email)}</span>` : ''}
              ${data.personal.phone ? `<span>📱 ${this.escapeHtml(data.personal.phone)}</span>` : ''}
              ${data.personal.location ? `<span>📍 ${this.escapeHtml(data.personal.location)}</span>` : ''}
            </div>
          </div>

          ${data.skills.length > 0 ? `
            <div class="sidebar-section">
              <div class="preview-section-title">Fähigkeiten</div>
              <div class="preview-skills">
                ${data.skills.map(s => `<span class="preview-skill">${this.escapeHtml(s)}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          ${data.languages.length > 0 ? `
            <div class="sidebar-section">
              <div class="preview-section-title">Sprachen</div>
              <div class="preview-languages-list">
              ${data.languages.map(l => `
                <div class="preview-language-item">
                  <span class="preview-language-name">${this.escapeHtml(l.name)}</span>
                  <span class="preview-language-level">${this.escapeHtml(l.level)}</span>
                </div>
              `).join('')}
              </div>
            </div>
          ` : ''}

          ${data.hobbies?.length > 0 ? `
            <div class="sidebar-section">
              <div class="preview-section-title">Hobbys</div>
              <div class="preview-skills">
                ${data.hobbies.map(h => `<span class="preview-skill preview-hobby">${this.escapeHtml(h)}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
        
        <div class="cv-main">
          ${data.summary ? `
            <div class="preview-section">
              <div class="preview-section-title">Berufliches Profil</div>
              <div class="preview-summary">${this.escapeHtml(data.summary)}</div>
            </div>
          ` : ''}

          ${data.experience.length > 0 ? `
            <div class="preview-section">
              <div class="preview-section-title">Berufserfahrung</div>
              ${data.experience.map(e => `
                <div class="preview-entry">
                  <div class="preview-entry-header">
                    <span class="preview-entry-title">${this.escapeHtml(e.title)}</span>
                    <span class="preview-entry-date">${this.escapeHtml(e.date)}</span>
                  </div>
                  ${e.company ? `<div class="preview-entry-company">${this.escapeHtml(e.company)}</div>` : ''}
                  ${e.description ? `<div class="preview-entry-desc">${this.escapeHtml(e.description)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${data.education.length > 0 ? `
            <div class="preview-section">
              <div class="preview-section-title">Ausbildung</div>
              ${data.education.map(e => `
                <div class="preview-entry">
                  <div class="preview-entry-header">
                    <span class="preview-entry-title">${this.escapeHtml(e.degree)}</span>
                    <span class="preview-entry-date">${this.escapeHtml(e.date)}</span>
                  </div>
                  ${e.school ? `<div class="preview-entry-company">${this.escapeHtml(e.school)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${data.certifications?.length > 0 ? `
            <div class="preview-section">
              <div class="preview-section-title">Zertifikate</div>
              ${data.certifications.map(c => `
                <div class="preview-entry">
                  <div class="preview-entry-header">
                    <span class="preview-entry-title">${this.escapeHtml(c.name)}</span>
                    <span class="preview-entry-date">${this.escapeHtml(c.date || '')}</span>
                  </div>
                  ${c.issuer ? `<div class="preview-entry-company">${this.escapeHtml(c.issuer)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${data.projects?.length > 0 ? `
            <div class="preview-section">
              <div class="preview-section-title">Projekte</div>
              ${data.projects.map(p => `
                <div class="preview-entry">
                  <div class="preview-entry-title">${this.escapeHtml(p.name)}</div>
                  ${p.description ? `<div class="preview-entry-desc">${this.escapeHtml(p.description)}</div>` : ''}
                  ${p.technologies ? `<div class="preview-entry-tech"><em>${this.escapeHtml(p.technologies)}</em></div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderKlassischTemplate(data) {
    const fullName = [data.personal.firstName, data.personal.lastName].filter(Boolean).join(' ');
    const hasPhoto = data.personal.photo && data.personal.photo.length > 0;
    const initials = (data.personal.firstName?.[0] || '') + (data.personal.lastName?.[0] || '');
    
    return `
      <div class="cv-template cv-template-klassisch">
        <div class="cv-template-inner">
          <div class="klassisch-header">
            <div class="klassisch-info">
              ${fullName ? `<div class="preview-name">${this.escapeHtml(fullName)}</div>` : ''}
              ${data.personal.title ? `<div class="preview-title">${this.escapeHtml(data.personal.title)}</div>` : ''}
              <div class="preview-contact">
                ${data.personal.email ? `<div>📧 ${this.escapeHtml(data.personal.email)}</div>` : ''}
                ${data.personal.phone ? `<div>📱 ${this.escapeHtml(data.personal.phone)}</div>` : ''}
                ${data.personal.location ? `<div>📍 ${this.escapeHtml(data.personal.location)}</div>` : ''}
              </div>
            </div>
            <div class="klassisch-photo">
              ${hasPhoto 
                ? `<img src="${data.personal.photo}" alt="Profile">`
                : `<div class="klassisch-avatar">${initials || '?'}</div>`
              }
            </div>
          </div>

          ${data.summary ? `
            <div class="preview-section">
              <div class="preview-section-title">Persönliches Profil</div>
              <div class="preview-summary">${this.escapeHtml(data.summary)}</div>
            </div>
          ` : ''}

          ${data.experience.length > 0 ? `
            <div class="preview-section">
              <div class="preview-section-title">Berufserfahrung</div>
              ${data.experience.map(e => `
                <div class="preview-entry">
                  <div class="preview-entry-header">
                    <span class="preview-entry-title">${this.escapeHtml(e.title)}</span>
                    <span class="preview-entry-date">${this.escapeHtml(e.date)}</span>
                  </div>
                  ${e.company ? `<div class="preview-entry-company">${this.escapeHtml(e.company)}</div>` : ''}
                  ${e.description ? `<div class="preview-entry-desc">${this.escapeHtml(e.description)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${data.education.length > 0 ? `
            <div class="preview-section">
              <div class="preview-section-title">Ausbildung</div>
              ${data.education.map(e => `
                <div class="preview-entry">
                  <div class="preview-entry-header">
                    <span class="preview-entry-title">${this.escapeHtml(e.degree)}</span>
                    <span class="preview-entry-date">${this.escapeHtml(e.date)}</span>
                  </div>
                  ${e.school ? `<div class="preview-entry-company">${this.escapeHtml(e.school)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${data.skills.length > 0 ? `
            <div class="preview-section">
              <div class="preview-section-title">Kenntnisse</div>
              <div class="preview-skills">
                ${data.skills.map(s => `<span class="preview-skill">${this.escapeHtml(s)}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          ${data.languages.length > 0 ? `
            <div class="preview-section">
              <div class="preview-section-title">Sprachen</div>
              <div class="preview-languages-list">
              ${data.languages.map(l => `
                <div class="preview-language-item">
                  <span class="preview-language-name">${this.escapeHtml(l.name)}</span>
                  <span class="preview-language-level">${this.escapeHtml(l.level)}</span>
                </div>
              `).join('')}
              </div>
            </div>
          ` : ''}

          ${data.certifications?.length > 0 ? `
            <div class="preview-section">
              <div class="preview-section-title">Zertifikate</div>
              ${data.certifications.map(c => `
                <div class="preview-entry">
                  <div class="preview-entry-header">
                    <span class="preview-entry-title">${this.escapeHtml(c.name)}</span>
                    <span class="preview-entry-date">${this.escapeHtml(c.date || '')}</span>
                  </div>
                  ${c.issuer ? `<div class="preview-entry-company">${this.escapeHtml(c.issuer)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${data.projects?.length > 0 ? `
            <div class="preview-section">
              <div class="preview-section-title">Projekte</div>
              ${data.projects.map(p => `
                <div class="preview-entry">
                  <div class="preview-entry-title">${this.escapeHtml(p.name)}</div>
                  ${p.description ? `<div class="preview-entry-desc">${this.escapeHtml(p.description)}</div>` : ''}
                  ${p.technologies ? `<div class="preview-entry-tech"><em>${this.escapeHtml(p.technologies)}</em></div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${data.hobbies?.length > 0 ? `
            <div class="preview-section">
              <div class="preview-section-title">Hobbys & Interessen</div>
              <div class="preview-skills">
                ${data.hobbies.map(h => `<span class="preview-skill preview-hobby">${this.escapeHtml(h)}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderKompaktTemplate(data) {
    const fullName = [data.personal.firstName, data.personal.lastName].filter(Boolean).join(' ');
    
    return `
      <div class="cv-template cv-template-kompakt">
        <div class="kompakt-header">
          ${fullName ? `<div class="preview-name">${this.escapeHtml(fullName)}</div>` : ''}
          ${data.personal.title ? `<div class="preview-title">${this.escapeHtml(data.personal.title)}</div>` : ''}
          <div class="preview-contact">
            ${data.personal.email ? `<span>📧 ${this.escapeHtml(data.personal.email)}</span>` : ''}
            ${data.personal.phone ? `<span>📱 ${this.escapeHtml(data.personal.phone)}</span>` : ''}
            ${data.personal.location ? `<span>📍 ${this.escapeHtml(data.personal.location)}</span>` : ''}
          </div>
        </div>
        
        <div class="kompakt-body">
          <div class="kompakt-main">
            ${data.summary ? `
              <div class="preview-section">
                <div class="preview-section-title">Profil</div>
                <div class="preview-summary">${this.escapeHtml(data.summary)}</div>
              </div>
            ` : ''}

            ${data.experience.length > 0 ? `
              <div class="preview-section">
                <div class="preview-section-title">Erfahrung</div>
                ${data.experience.map(e => `
                  <div class="preview-entry">
                    <div class="preview-entry-header">
                      <span class="preview-entry-title">${this.escapeHtml(e.title)}</span>
                      <span class="preview-entry-date">${this.escapeHtml(e.date)}</span>
                    </div>
                    ${e.company ? `<div class="preview-entry-company">${this.escapeHtml(e.company)}</div>` : ''}
                    ${e.description ? `<div class="preview-entry-desc">${this.escapeHtml(e.description)}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${data.education.length > 0 ? `
              <div class="preview-section">
                <div class="preview-section-title">Bildung</div>
                ${data.education.map(e => `
                  <div class="preview-entry">
                    <div class="preview-entry-header">
                      <span class="preview-entry-title">${this.escapeHtml(e.degree)}</span>
                      <span class="preview-entry-date">${this.escapeHtml(e.date)}</span>
                    </div>
                    ${e.school ? `<div class="preview-entry-company">${this.escapeHtml(e.school)}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
          
          <div class="kompakt-sidebar">
            ${data.skills.length > 0 ? `
              <div class="preview-section">
                <div class="preview-section-title">Skills</div>
                <div class="preview-skills">
                  ${data.skills.map(s => `<span class="preview-skill">${this.escapeHtml(s)}</span>`).join('')}
                </div>
              </div>
            ` : ''}

            ${data.languages.length > 0 ? `
              <div class="preview-section">
                <div class="preview-section-title">Sprachen</div>
                <div class="preview-languages-list">
                ${data.languages.map(l => `
                  <div class="preview-language-item">
                    <span class="preview-language-name">${this.escapeHtml(l.name)}</span>
                    <span class="preview-language-level">${this.escapeHtml(l.level)}</span>
                  </div>
                `).join('')}
                </div>
              </div>
            ` : ''}

            ${data.certifications?.length > 0 ? `
              <div class="preview-section">
                <div class="preview-section-title">Zertifikate</div>
                ${data.certifications.map(c => `
                  <div class="preview-entry-compact">
                    <span>${this.escapeHtml(c.name)}</span>
                    ${c.date ? `<span class="preview-entry-date">${this.escapeHtml(c.date)}</span>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${data.hobbies?.length > 0 ? `
              <div class="preview-section">
                <div class="preview-section-title">Hobbys</div>
                <div class="preview-skills">
                  ${data.hobbies.map(h => `<span class="preview-skill preview-hobby">${this.escapeHtml(h)}</span>`).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // NEW TEMPLATES
  // ==========================================

  renderMinimalistTemplate(data, accentColor = 'emerald') {
    const colors = COLOR_MAP[accentColor] || COLOR_MAP.emerald;
    const fullName = [data.personal.firstName, data.personal.lastName].filter(Boolean).join(' ');
    
    return `
      <div class="cv-template cv-template-minimalist" style="--accent: ${colors.primary}; --accent-light: ${colors.light};">
        <div class="cv-template-inner" style="padding: 50px;">
          <div style="text-align: center; margin-bottom: 30px;">
            ${fullName ? `<div style="font-size: 32px; font-weight: 300; letter-spacing: 4px; text-transform: uppercase; color: #1a1a1a;">${this.escapeHtml(fullName)}</div>` : ''}
            ${data.personal.title ? `<div style="font-size: 14px; color: ${colors.primary}; margin-top: 8px; letter-spacing: 2px;">${this.escapeHtml(data.personal.title)}</div>` : ''}
          </div>
          
          <div style="height: 1px; background: #e5e5e5; margin: 25px 0;"></div>
          
          <div style="display: flex; justify-content: center; gap: 30px; font-size: 12px; color: #666; margin-bottom: 30px;">
            ${data.personal.email ? `<span>${this.escapeHtml(data.personal.email)}</span>` : ''}
            ${data.personal.phone ? `<span>${this.escapeHtml(data.personal.phone)}</span>` : ''}
            ${data.personal.location ? `<span>${this.escapeHtml(data.personal.location)}</span>` : ''}
          </div>

          ${data.summary ? `
            <div style="margin-bottom: 25px;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: ${colors.primary}; margin-bottom: 10px;">Profil</div>
              <div style="font-size: 13px; line-height: 1.7; color: #444;">${this.escapeHtml(data.summary)}</div>
            </div>
          ` : ''}

          ${data.experience.length > 0 ? `
            <div style="margin-bottom: 25px;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: ${colors.primary}; margin-bottom: 15px;">Erfahrung</div>
              ${data.experience.map(e => `
                <div style="margin-bottom: 15px;">
                  <div style="display: flex; justify-content: space-between; align-items: baseline;">
                    <span style="font-weight: 500; color: #1a1a1a;">${this.escapeHtml(e.title)}</span>
                    <span style="font-size: 11px; color: #999;">${this.escapeHtml(e.date)}</span>
                  </div>
                  ${e.company ? `<div style="font-size: 12px; color: #666; margin-top: 2px;">${this.escapeHtml(e.company)}</div>` : ''}
                  ${e.description ? `<div style="font-size: 12px; color: #555; margin-top: 6px; line-height: 1.6;">${this.escapeHtml(e.description)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${data.education.length > 0 ? `
            <div style="margin-bottom: 25px;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: ${colors.primary}; margin-bottom: 15px;">Ausbildung</div>
              ${data.education.map(e => `
                <div style="margin-bottom: 10px; display: flex; justify-content: space-between;">
                  <div>
                    <span style="font-weight: 500;">${this.escapeHtml(e.degree)}</span>
                    ${e.school ? `<span style="color: #666;"> — ${this.escapeHtml(e.school)}</span>` : ''}
                  </div>
                  <span style="font-size: 11px; color: #999;">${this.escapeHtml(e.date)}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${data.skills.length > 0 ? `
            <div style="margin-bottom: 25px;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: ${colors.primary}; margin-bottom: 10px;">Fähigkeiten</div>
              <div style="font-size: 12px; color: #555;">${data.skills.join(' · ')}</div>
            </div>
          ` : ''}

          ${data.languages.length > 0 ? `
            <div style="margin-bottom: 25px;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: ${colors.primary}; margin-bottom: 10px;">Sprachen</div>
              <div style="font-size: 12px; color: #555;">${data.languages.map(l => `${l.name} (${l.level})`).join(' · ')}</div>
            </div>
          ` : ''}

          ${data.certifications?.length > 0 ? `
            <div style="margin-bottom: 25px;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: ${colors.primary}; margin-bottom: 10px;">Zertifikate</div>
              <div style="font-size: 12px; color: #555;">${data.certifications.map(c => `${c.name}${c.issuer ? ` (${c.issuer})` : ''}`).join(' · ')}</div>
            </div>
          ` : ''}

          ${data.projects?.length > 0 ? `
            <div style="margin-bottom: 25px;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: ${colors.primary}; margin-bottom: 15px;">Projekte</div>
              ${data.projects.map(p => `
                <div style="margin-bottom: 10px;">
                  <div style="font-weight: 500; color: #1a1a1a;">${this.escapeHtml(p.name)}</div>
                  ${p.description ? `<div style="font-size: 12px; color: #666; margin-top: 2px;">${this.escapeHtml(p.description)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${data.hobbies?.length > 0 ? `
            <div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: ${colors.primary}; margin-bottom: 10px;">Hobbys</div>
              <div style="font-size: 12px; color: #555;">${data.hobbies.join(' · ')}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderExecutiveTemplate(data, accentColor = 'emerald') {
    const colors = COLOR_MAP[accentColor] || COLOR_MAP.emerald;
    const fullName = [data.personal.firstName, data.personal.lastName].filter(Boolean).join(' ');
    
    return `
      <div class="cv-template cv-template-executive" style="--accent: ${colors.primary};">
        <div class="cv-template-inner" style="padding: 40px 50px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 15px; border-bottom: 3px solid ${colors.primary};">
            <div>
              ${fullName ? `<div style="font-size: 28px; font-weight: 700; color: #1e293b;">${this.escapeHtml(fullName)}</div>` : ''}
              ${data.personal.title ? `<div style="font-size: 16px; color: ${colors.primary}; font-weight: 500; margin-top: 4px;">${this.escapeHtml(data.personal.title)}</div>` : ''}
            </div>
            <div style="text-align: right; font-size: 12px; color: #64748b;">
              ${data.personal.email ? `<div>${this.escapeHtml(data.personal.email)}</div>` : ''}
              ${data.personal.phone ? `<div>${this.escapeHtml(data.personal.phone)}</div>` : ''}
              ${data.personal.location ? `<div>${this.escapeHtml(data.personal.location)}</div>` : ''}
            </div>
          </div>

          ${data.summary ? `
            <div style="margin: 25px 0; padding: 20px; background: ${colors.light}; border-left: 4px solid ${colors.primary};">
              <div style="font-size: 13px; line-height: 1.7; color: #334155;">${this.escapeHtml(data.summary)}</div>
            </div>
          ` : ''}

          ${data.experience.length > 0 ? `
            <div style="margin-bottom: 25px;">
              <div style="font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${colors.primary}; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 1px solid #e2e8f0;">Berufserfahrung</div>
              ${data.experience.map(e => `
                <div style="margin-bottom: 18px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="font-size: 15px; font-weight: 600; color: #1e293b;">${this.escapeHtml(e.title)}</span>
                    <span style="font-size: 12px; color: #64748b;">${this.escapeHtml(e.date)}</span>
                  </div>
                  ${e.company ? `<div style="font-size: 13px; color: ${colors.primary}; font-weight: 500;">${this.escapeHtml(e.company)}</div>` : ''}
                  ${e.description ? `<div style="font-size: 12px; color: #475569; margin-top: 6px; line-height: 1.6;">${this.escapeHtml(e.description)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div style="display: flex; gap: 40px;">
            <div style="flex: 1;">
              ${data.education.length > 0 ? `
                <div style="margin-bottom: 20px;">
                  <div style="font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${colors.primary}; margin-bottom: 12px;">Ausbildung</div>
                  ${data.education.map(e => `
                    <div style="margin-bottom: 10px;">
                      <div style="font-weight: 500; color: #1e293b;">${this.escapeHtml(e.degree)}</div>
                      <div style="font-size: 12px; color: #64748b;">${this.escapeHtml(e.school)} · ${this.escapeHtml(e.date)}</div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
            <div style="flex: 1;">
              ${data.skills.length > 0 ? `
                <div style="margin-bottom: 20px;">
                  <div style="font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${colors.primary}; margin-bottom: 12px;">Kernkompetenzen</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${data.skills.map(s => `<span style="background: ${colors.light}; color: ${colors.dark}; padding: 4px 10px; border-radius: 4px; font-size: 11px;">${this.escapeHtml(s)}</span>`).join('')}
                  </div>
                </div>
              ` : ''}
              ${data.languages.length > 0 ? `
                <div style="margin-bottom: 20px;">
                  <div style="font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${colors.primary}; margin-bottom: 12px;">Sprachen</div>
                  ${data.languages.map(l => `<div style="font-size: 12px; margin-bottom: 4px;"><strong>${this.escapeHtml(l.name)}</strong> — ${this.escapeHtml(l.level)}</div>`).join('')}
                </div>
              ` : ''}
              ${data.certifications?.length > 0 ? `
                <div style="margin-bottom: 20px;">
                  <div style="font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${colors.primary}; margin-bottom: 12px;">Zertifikate</div>
                  ${data.certifications.map(c => `<div style="font-size: 12px; margin-bottom: 4px;">${this.escapeHtml(c.name)}${c.date ? ` <span style="color: #94a3b8;">(${this.escapeHtml(c.date)})</span>` : ''}</div>`).join('')}
                </div>
              ` : ''}
            </div>
          </div>

          ${data.projects?.length > 0 ? `
            <div style="margin-top: 20px;">
              <div style="font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${colors.primary}; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 1px solid #e2e8f0;">Projekte</div>
              ${data.projects.map(p => `
                <div style="margin-bottom: 15px;">
                  <div style="font-weight: 600; color: #1e293b;">${this.escapeHtml(p.name)}</div>
                  ${p.description ? `<div style="font-size: 12px; color: #64748b; margin-top: 4px;">${this.escapeHtml(p.description)}</div>` : ''}
                  ${p.technologies ? `<div style="font-size: 11px; color: ${colors.primary}; margin-top: 4px;">${this.escapeHtml(p.technologies)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${data.hobbies?.length > 0 ? `
            <div style="margin-top: 20px;">
              <div style="font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${colors.primary}; margin-bottom: 12px;">Hobbys & Interessen</div>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${data.hobbies.map(h => `<span style="background: ${colors.light}; color: ${colors.dark}; padding: 4px 10px; border-radius: 4px; font-size: 11px;">${this.escapeHtml(h)}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderTechTemplate(data, accentColor = 'emerald') {
    const colors = COLOR_MAP[accentColor] || COLOR_MAP.emerald;
    const fullName = [data.personal.firstName, data.personal.lastName].filter(Boolean).join(' ');
    
    return `
      <div class="cv-template cv-template-tech" style="--accent: ${colors.primary}; background: #0f172a; color: #e2e8f0;">
        <div style="background: ${colors.gradient}; padding: 30px 40px; color: white;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              ${fullName ? `<div style="font-size: 28px; font-weight: 700;">${this.escapeHtml(fullName)}</div>` : ''}
              ${data.personal.title ? `<div style="font-size: 16px; opacity: 0.9; margin-top: 4px;">${this.escapeHtml(data.personal.title)}</div>` : ''}
            </div>
            <div style="text-align: right; font-size: 12px; opacity: 0.9;">
              ${data.personal.email ? `<div>📧 ${this.escapeHtml(data.personal.email)}</div>` : ''}
              ${data.personal.phone ? `<div>📱 ${this.escapeHtml(data.personal.phone)}</div>` : ''}
              ${data.personal.location ? `<div>📍 ${this.escapeHtml(data.personal.location)}</div>` : ''}
            </div>
          </div>
        </div>
        
        <div style="display: flex; min-height: calc(297mm - 100px);">
          <div style="flex: 2; padding: 30px 35px; background: white; color: #1e293b;">
            ${data.summary ? `
              <div style="margin-bottom: 25px;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${colors.primary}; margin-bottom: 10px;">// Über mich</div>
                <div style="font-size: 13px; line-height: 1.7; color: #475569;">${this.escapeHtml(data.summary)}</div>
              </div>
            ` : ''}

            ${data.experience.length > 0 ? `
              <div style="margin-bottom: 25px;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${colors.primary}; margin-bottom: 15px;">// Erfahrung</div>
                ${data.experience.map(e => `
                  <div style="margin-bottom: 18px; padding-left: 15px; border-left: 2px solid ${colors.primary};">
                    <div style="font-weight: 600; color: #1e293b;">${this.escapeHtml(e.title)}</div>
                    <div style="font-size: 12px; color: ${colors.primary};">${this.escapeHtml(e.company)} <span style="color: #94a3b8;">| ${this.escapeHtml(e.date)}</span></div>
                    ${e.description ? `<div style="font-size: 12px; color: #64748b; margin-top: 6px; line-height: 1.6;">${this.escapeHtml(e.description)}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${data.projects?.length > 0 ? `
              <div style="margin-bottom: 25px;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${colors.primary}; margin-bottom: 15px;">// Projekte</div>
                ${data.projects.map(p => `
                  <div style="margin-bottom: 15px; padding: 12px; background: #f8fafc; border-radius: 6px;">
                    <div style="font-weight: 600; color: #1e293b;">${this.escapeHtml(p.name)}</div>
                    ${p.description ? `<div style="font-size: 12px; color: #64748b; margin-top: 4px;">${this.escapeHtml(p.description)}</div>` : ''}
                    ${p.technologies ? `<div style="font-size: 11px; color: ${colors.primary}; margin-top: 6px; font-family: monospace;">${this.escapeHtml(p.technologies)}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
          
          <div style="flex: 1; padding: 30px 25px; background: #1e293b; color: #e2e8f0;">
            ${data.skills.length > 0 ? `
              <div style="margin-bottom: 25px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${colors.primary}; margin-bottom: 12px;">Tech Stack</div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                  ${data.skills.map(s => `<span style="background: #334155; color: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-family: monospace;">${this.escapeHtml(s)}</span>`).join('')}
                </div>
              </div>
            ` : ''}

            ${data.education.length > 0 ? `
              <div style="margin-bottom: 25px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${colors.primary}; margin-bottom: 12px;">Ausbildung</div>
                ${data.education.map(e => `
                  <div style="margin-bottom: 10px;">
                    <div style="font-size: 13px; font-weight: 500;">${this.escapeHtml(e.degree)}</div>
                    <div style="font-size: 11px; color: #94a3b8;">${this.escapeHtml(e.school)}</div>
                    <div style="font-size: 10px; color: #64748b;">${this.escapeHtml(e.date)}</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${data.languages.length > 0 ? `
              <div style="margin-bottom: 25px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${colors.primary}; margin-bottom: 12px;">Sprachen</div>
                ${data.languages.map(l => `<div style="font-size: 12px; margin-bottom: 4px;">${this.escapeHtml(l.name)} <span style="color: #64748b;">— ${this.escapeHtml(l.level)}</span></div>`).join('')}
              </div>
            ` : ''}

            ${data.certifications?.length > 0 ? `
              <div style="margin-bottom: 25px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${colors.primary}; margin-bottom: 12px;">Zertifikate</div>
                ${data.certifications.map(c => `<div style="font-size: 12px; margin-bottom: 6px;">${this.escapeHtml(c.name)} <span style="color: #64748b; font-size: 10px;">${this.escapeHtml(c.date || '')}</span></div>`).join('')}
              </div>
            ` : ''}

            ${data.hobbies?.length > 0 ? `
              <div>
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${colors.primary}; margin-bottom: 12px;">Hobbys</div>
                <div style="font-size: 12px; color: #94a3b8; line-height: 1.6;">${data.hobbies.join(', ')}</div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  renderElegantTemplate(data, accentColor = 'emerald') {
    const colors = COLOR_MAP[accentColor] || COLOR_MAP.emerald;
    const fullName = [data.personal.firstName, data.personal.lastName].filter(Boolean).join(' ');
    
    return `
      <div class="cv-template cv-template-elegant" style="--accent: ${colors.primary}; background: #fffbf5; min-height: 297mm;">
        <div style="border: 2px solid ${colors.primary}; margin: 20px; padding: 40px;">
          <div style="text-align: center; margin-bottom: 30px;">
            ${fullName ? `<div style="font-size: 30px; font-weight: 300; color: #44403c; letter-spacing: 3px; font-family: Georgia, serif;">${this.escapeHtml(fullName)}</div>` : ''}
            ${data.personal.title ? `<div style="font-size: 14px; color: ${colors.primary}; margin-top: 8px; font-style: italic;">${this.escapeHtml(data.personal.title)}</div>` : ''}
            <div style="width: 60px; height: 2px; background: ${colors.primary}; margin: 20px auto;"></div>
            <div style="font-size: 11px; color: #78716c;">
              ${[data.personal.email, data.personal.phone, data.personal.location].filter(Boolean).join(' · ')}
            </div>
          </div>

          ${data.summary ? `
            <div style="margin-bottom: 30px; text-align: center; max-width: 500px; margin-left: auto; margin-right: auto;">
              <div style="font-size: 13px; line-height: 1.8; color: #57534e; font-style: italic;">"${this.escapeHtml(data.summary)}"</div>
            </div>
          ` : ''}

          ${data.experience.length > 0 ? `
            <div style="margin-bottom: 30px;">
              <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 3px; color: ${colors.primary}; text-align: center; margin-bottom: 20px;">Berufserfahrung</div>
              ${data.experience.map(e => `
                <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e7e5e4;">
                  <div style="display: flex; justify-content: space-between; align-items: baseline;">
                    <span style="font-size: 15px; font-weight: 500; color: #44403c;">${this.escapeHtml(e.title)}</span>
                    <span style="font-size: 11px; color: #a8a29e; font-style: italic;">${this.escapeHtml(e.date)}</span>
                  </div>
                  ${e.company ? `<div style="font-size: 12px; color: ${colors.primary}; margin-top: 3px;">${this.escapeHtml(e.company)}</div>` : ''}
                  ${e.description ? `<div style="font-size: 12px; color: #78716c; margin-top: 8px; line-height: 1.7;">${this.escapeHtml(e.description)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div style="display: flex; gap: 50px;">
            <div style="flex: 1;">
              ${data.education.length > 0 ? `
                <div style="margin-bottom: 25px;">
                  <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 3px; color: ${colors.primary}; margin-bottom: 15px;">Ausbildung</div>
                  ${data.education.map(e => `
                    <div style="margin-bottom: 12px;">
                      <div style="font-weight: 500; color: #44403c;">${this.escapeHtml(e.degree)}</div>
                      <div style="font-size: 12px; color: #78716c;">${this.escapeHtml(e.school)} · ${this.escapeHtml(e.date)}</div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
            <div style="flex: 1;">
              ${data.skills.length > 0 ? `
                <div style="margin-bottom: 25px;">
                  <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 3px; color: ${colors.primary}; margin-bottom: 15px;">Fähigkeiten</div>
                  <div style="font-size: 12px; color: #57534e; line-height: 1.8;">${data.skills.join(' · ')}</div>
                </div>
              ` : ''}
              ${data.languages.length > 0 ? `
                <div style="margin-bottom: 25px;">
                  <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 3px; color: ${colors.primary}; margin-bottom: 15px;">Sprachen</div>
                  <div style="font-size: 12px; color: #57534e; line-height: 1.8;">${data.languages.map(l => `${l.name} (${l.level})`).join(' · ')}</div>
                </div>
              ` : ''}
              ${data.certifications?.length > 0 ? `
                <div>
                  <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 3px; color: ${colors.primary}; margin-bottom: 15px;">Zertifikate</div>
                  <div style="font-size: 12px; color: #57534e; line-height: 1.8;">${data.certifications.map(c => c.name).join(' · ')}</div>
                </div>
              ` : ''}
            </div>
          </div>

          ${data.projects?.length > 0 ? `
            <div style="margin-top: 25px;">
              <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 3px; color: ${colors.primary}; text-align: center; margin-bottom: 20px;">Projekte</div>
              ${data.projects.map(p => `
                <div style="margin-bottom: 15px; padding-bottom: 12px; border-bottom: 1px solid #e7e5e4;">
                  <div style="font-weight: 500; color: #44403c;">${this.escapeHtml(p.name)}</div>
                  ${p.description ? `<div style="font-size: 12px; color: #78716c; margin-top: 4px; font-style: italic;">${this.escapeHtml(p.description)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${data.hobbies?.length > 0 ? `
            <div style="margin-top: 25px; text-align: center;">
              <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 3px; color: ${colors.primary}; margin-bottom: 15px;">Hobbys & Interessen</div>
              <div style="font-size: 12px; color: #57534e; line-height: 1.8;">${data.hobbies.join(' · ')}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderBoldTemplate(data, accentColor = 'emerald') {
    const colors = COLOR_MAP[accentColor] || COLOR_MAP.emerald;
    const fullName = [data.personal.firstName, data.personal.lastName].filter(Boolean).join(' ');
    
    return `
      <div class="cv-template cv-template-bold" style="--accent: ${colors.primary}; display: flex;">
        <div style="width: 12px; background: ${colors.gradient};"></div>
        <div style="flex: 1; padding: 40px;">
          <div style="margin-bottom: 30px;">
            ${fullName ? `<div style="font-size: 36px; font-weight: 800; color: #1e293b; line-height: 1.1;">${this.escapeHtml(fullName)}</div>` : ''}
            ${data.personal.title ? `<div style="font-size: 18px; color: ${colors.primary}; font-weight: 600; margin-top: 8px;">${this.escapeHtml(data.personal.title)}</div>` : ''}
            <div style="display: flex; gap: 20px; margin-top: 15px; font-size: 12px; color: #64748b;">
              ${data.personal.email ? `<span>📧 ${this.escapeHtml(data.personal.email)}</span>` : ''}
              ${data.personal.phone ? `<span>📱 ${this.escapeHtml(data.personal.phone)}</span>` : ''}
              ${data.personal.location ? `<span>📍 ${this.escapeHtml(data.personal.location)}</span>` : ''}
            </div>
          </div>

          ${data.summary ? `
            <div style="margin-bottom: 30px; padding: 20px; background: ${colors.light}; border-radius: 8px;">
              <div style="font-size: 14px; line-height: 1.7; color: #334155;">${this.escapeHtml(data.summary)}</div>
            </div>
          ` : ''}

          ${data.experience.length > 0 ? `
            <div style="margin-bottom: 30px;">
              <div style="font-size: 16px; font-weight: 800; text-transform: uppercase; color: ${colors.primary}; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                <span style="width: 30px; height: 3px; background: ${colors.primary};"></span> Erfahrung
              </div>
              ${data.experience.map(e => `
                <div style="margin-bottom: 20px; padding-left: 20px; border-left: 3px solid ${colors.light};">
                  <div style="font-size: 16px; font-weight: 700; color: #1e293b;">${this.escapeHtml(e.title)}</div>
                  <div style="font-size: 13px; color: ${colors.primary}; font-weight: 600;">${this.escapeHtml(e.company)} <span style="color: #94a3b8; font-weight: 400;">| ${this.escapeHtml(e.date)}</span></div>
                  ${e.description ? `<div style="font-size: 13px; color: #64748b; margin-top: 8px; line-height: 1.6;">${this.escapeHtml(e.description)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div style="display: flex; gap: 40px;">
            <div style="flex: 1;">
              ${data.education.length > 0 ? `
                <div style="margin-bottom: 25px;">
                  <div style="font-size: 14px; font-weight: 800; text-transform: uppercase; color: ${colors.primary}; margin-bottom: 12px;">Ausbildung</div>
                  ${data.education.map(e => `
                    <div style="margin-bottom: 12px;">
                      <div style="font-weight: 600; color: #1e293b;">${this.escapeHtml(e.degree)}</div>
                      <div style="font-size: 12px; color: #64748b;">${this.escapeHtml(e.school)} · ${this.escapeHtml(e.date)}</div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
            <div style="flex: 1;">
              ${data.skills.length > 0 ? `
                <div style="margin-bottom: 25px;">
                  <div style="font-size: 14px; font-weight: 800; text-transform: uppercase; color: ${colors.primary}; margin-bottom: 12px;">Skills</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${data.skills.map(s => `<span style="background: ${colors.primary}; color: white; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">${this.escapeHtml(s)}</span>`).join('')}
                  </div>
                </div>
              ` : ''}
              ${data.languages.length > 0 ? `
                <div style="margin-bottom: 25px;">
                  <div style="font-size: 14px; font-weight: 800; text-transform: uppercase; color: ${colors.primary}; margin-bottom: 12px;">Sprachen</div>
                  ${data.languages.map(l => `<div style="font-size: 13px; margin-bottom: 4px;"><strong>${this.escapeHtml(l.name)}</strong> — ${this.escapeHtml(l.level)}</div>`).join('')}
                </div>
              ` : ''}
              ${data.certifications?.length > 0 ? `
                <div>
                  <div style="font-size: 14px; font-weight: 800; text-transform: uppercase; color: ${colors.primary}; margin-bottom: 12px;">Zertifikate</div>
                  ${data.certifications.map(c => `<div style="font-size: 13px; margin-bottom: 4px;">${this.escapeHtml(c.name)}${c.date ? ` <span style="color: #94a3b8;">(${c.date})</span>` : ''}</div>`).join('')}
                </div>
              ` : ''}
            </div>
          </div>

          ${data.projects?.length > 0 ? `
            <div style="margin-top: 25px;">
              <div style="font-size: 16px; font-weight: 800; text-transform: uppercase; color: ${colors.primary}; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                <span style="width: 30px; height: 3px; background: ${colors.primary};"></span> Projekte
              </div>
              ${data.projects.map(p => `
                <div style="margin-bottom: 15px; padding-left: 20px; border-left: 3px solid ${colors.light};">
                  <div style="font-size: 15px; font-weight: 700; color: #1e293b;">${this.escapeHtml(p.name)}</div>
                  ${p.description ? `<div style="font-size: 13px; color: #64748b; margin-top: 4px;">${this.escapeHtml(p.description)}</div>` : ''}
                  ${p.technologies ? `<div style="font-size: 12px; color: ${colors.primary}; margin-top: 4px;">${this.escapeHtml(p.technologies)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${data.hobbies?.length > 0 ? `
            <div style="margin-top: 25px;">
              <div style="font-size: 14px; font-weight: 800; text-transform: uppercase; color: ${colors.primary}; margin-bottom: 12px;">Hobbys & Interessen</div>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${data.hobbies.map(h => `<span style="background: ${colors.primary}; color: white; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">${this.escapeHtml(h)}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // ==========================================
  // PDF EXPORT
  // ==========================================

  exportPDF() {
    // Switch to preview for export
    this.switchTab('preview');
    this.updatePreview();
    
    // Ensure preview content is visible
    this.previewContent.style.display = 'flex';

    // Store reference to this for use in setTimeout
    const self = this;

    // Give time for preview to render, then export
    setTimeout(() => {
      // Check if html2pdf is available
      if (typeof html2pdf !== 'undefined') {
        self.exportWithHtml2Pdf();
      } else {
        // Fallback to browser print
        console.log('html2pdf not available, using browser print');
        window.print();
      }
    }, 300);
  }

  exportWithHtml2Pdf() {
    const element = document.getElementById('cv-preview-page');
    if (!element) {
      console.error('CV preview element not found');
      window.print();
      return;
    }

    const data = cvStore.getData();
    const personal = data.personal || {};
    const fileName = [personal.firstName, personal.lastName].filter(Boolean).join('_') || 'CV';

    // Get the actual element dimensions
    const elementWidth = element.offsetWidth;
    const elementHeight = element.offsetHeight;
    
    // A4 dimensions in mm
    const a4Width = 210;
    const a4Height = 297;

    const opt = {
      margin: 0,
      filename: `${fileName}_Lebenslauf.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { 
        scale: 4, // Higher scale for crisp text
        useCORS: true,
        logging: false,
        allowTaint: true,
        width: elementWidth,
        height: Math.min(elementHeight, 1123), // Cap at A4 height in pixels (297mm at 96dpi)
        scrollY: 0,
        scrollX: 0
      },
      jsPDF: { 
        unit: 'mm', 
        format: [a4Width, a4Height],
        orientation: 'portrait',
        compress: true,
        hotfixes: ['px_scaling']
      },
      pagebreak: { mode: 'avoid-all', before: [], after: [], avoid: [] }
    };

    // Show loading state
    const exportBtn = document.getElementById('btn-export-pdf');
    const originalText = exportBtn ? exportBtn.innerHTML : '';
    
    if (exportBtn) {
      exportBtn.disabled = true;
      exportBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
          <circle cx="12" cy="12" r="10"></circle>
        </svg>
        Exporting...
      `;
    }

    try {
      html2pdf().set(opt).from(element).toPdf().get('pdf').then((pdf) => {
        // Remove any extra pages beyond the first
        const totalPages = pdf.internal.getNumberOfPages();
        if (totalPages > 1) {
          for (let i = totalPages; i > 1; i--) {
            pdf.deletePage(i);
          }
        }
        pdf.save(opt.filename);
        
        console.log('PDF export successful');
        if (exportBtn) {
          exportBtn.disabled = false;
          exportBtn.innerHTML = originalText;
        }
      }).catch((err) => {
        console.error('PDF export error:', err);
        if (exportBtn) {
          exportBtn.disabled = false;
          exportBtn.innerHTML = originalText;
        }
        // Fallback to print
        window.print();
      });
    } catch (err) {
      console.error('PDF export exception:', err);
      if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.innerHTML = originalText;
      }
      window.print();
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================

  createSection(id, title, iconSvg, noActions = false) {
    const section = document.createElement('div');
    section.className = 'cv-section';
    section.dataset.section = id;
    
    // Determine if this section should have AI edit button
    const aiSections = ['summary', 'skills'];
    const showAiButton = aiSections.includes(id) && hasApiKey();
    
    section.innerHTML = `
      <div class="cv-section-header">
        <div class="cv-section-title">${iconSvg} ${title}</div>
        <div class="cv-section-actions">
          ${showAiButton ? `
            <button class="btn-ai-edit" data-ai-section="${id}" title="AI Help">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
                <path d="M16 14H8a4 4 0 0 0-4 4v2h16v-2a4 4 0 0 0-4-4z"/>
              </svg>
              <span>AI</span>
            </button>
          ` : ''}
        </div>
      </div>
      <div class="cv-section-body"></div>
    `;
    
    // Attach AI button listener
    if (showAiButton) {
      const aiBtn = section.querySelector('.btn-ai-edit');
      if (aiBtn) {
        aiBtn.addEventListener('click', () => this.openAiEditModal(id));
      }
    }
    
    return section;
  }

  insertSectionInOrder(section, id) {
    const order = ['personal', 'summary', 'experience', 'education', 'skills', 'languages', 'certifications', 'projects', 'hobbies'];
    const idx = order.indexOf(id);
    const children = Array.from(this.cvDocument.children);

    let inserted = false;
    for (const child of children) {
      const childIdx = order.indexOf(child.dataset.section);
      if (childIdx > idx) {
        this.cvDocument.insertBefore(section, child);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      this.cvDocument.appendChild(section);
    }
  }

  attachEditableListeners(section, type) {
    section.querySelectorAll('.editable-field').forEach(el => {
      el.addEventListener('blur', () => {
        const field = el.dataset.field;
        const value = el.textContent.trim();
        if (type === 'personal') {
          if (field === 'fullName') {
            const parts = value.split(' ');
            cvStore.setPersonalBulk({
              firstName: parts[0] || '',
              lastName: parts.slice(1).join(' ') || '',
            });
          } else {
            cvStore.setPersonal(field, value);
          }
        } else if (type === 'summary') {
          cvStore.setSummary(value);
        }
      });
    });
  }

  attachEntryEditableListeners(section, type) {
    section.querySelectorAll('.editable-field[data-entry-id]').forEach(el => {
      el.addEventListener('blur', () => {
        const entryId = el.dataset.entryId;
        const field = el.dataset.field;
        const value = el.textContent.trim();
        if (type === 'experience') {
          cvStore.updateExperience(entryId, { [field]: value });
        } else if (type === 'education') {
          cvStore.updateEducation(entryId, { [field]: value });
        } else if (type === 'certifications') {
          cvStore.updateCertification(entryId, { [field]: value });
        } else if (type === 'projects') {
          cvStore.updateProject(entryId, { [field]: value });
        }
      });
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ==========================================
  // AI EDIT MODAL
  // ==========================================

  openAiEditModal(sectionId, entryId = null, isEmpty = false) {
    // Remove existing modal if any
    const existingModal = document.querySelector('.ai-edit-modal');
    if (existingModal) existingModal.remove();

    // Get current content and context
    let currentContent = '';
    let sectionTitle = '';
    let contextInfo = '';
    
    if (sectionId === 'summary') {
      currentContent = cvStore.getSummary();
      sectionTitle = 'Professional Summary';
      const personal = cvStore.getPersonal();
      contextInfo = personal.title || '';
      isEmpty = !currentContent || currentContent.trim() === '';
    } else if (sectionId === 'skills') {
      currentContent = cvStore.getSkills().join(', ');
      sectionTitle = 'Skills';
      const personal = cvStore.getPersonal();
      contextInfo = personal.title || '';
      isEmpty = !currentContent || currentContent.trim() === '';
    } else if (sectionId === 'experience' && entryId) {
      const exp = cvStore.getExperience().find(e => e.id === entryId);
      if (exp) {
        currentContent = exp.description;
        sectionTitle = exp.title ? `Job Description: ${exp.title}` : 'Job Description';
        contextInfo = `${exp.title || ''} at ${exp.company || ''}`;
      }
    }

    // Different UI for empty vs edit mode
    const isGenerateMode = isEmpty;
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'ai-edit-modal';
    modal.innerHTML = `
      <div class="ai-edit-card">
        <div class="ai-edit-header">
          <h3>${isGenerateMode ? '✨ AI Generate' : '✨ AI Edit'}: ${sectionTitle}</h3>
          <button class="ai-edit-close">&times;</button>
        </div>
        <div class="ai-edit-body">
          ${!isGenerateMode ? `
            <div class="ai-edit-current">
              <label>Current Text:</label>
              <div class="ai-edit-preview">${this.escapeHtml(currentContent)}</div>
            </div>
            <div class="ai-edit-input-group">
              <label>What would you like to change?</label>
              <textarea class="ai-edit-input" placeholder="e.g., Make it shorter, More professional, Add more details about leadership..."></textarea>
            </div>
          ` : `
            <div class="ai-generate-info">
              <div class="ai-generate-icon">✨</div>
              <p>Let AI generate professional content for this section based on your job information.</p>
              ${contextInfo ? `<div class="ai-context-badge">${this.escapeHtml(contextInfo)}</div>` : ''}
            </div>
            <div class="ai-edit-input-group">
              <label>Any specific details to include? (optional)</label>
              <textarea class="ai-edit-input" placeholder="e.g., Focus on leadership, Include technical skills, Mention team management..."></textarea>
            </div>
          `}
          <div class="ai-edit-result" style="display: none;">
            <label>AI Suggestion:</label>
            <div class="ai-edit-suggestion"></div>
          </div>
        </div>
        <div class="ai-edit-footer">
          <button class="btn btn-ghost ai-edit-cancel">Cancel</button>
          <button class="btn btn-primary ai-edit-generate">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
              <path d="M16 14H8a4 4 0 0 0-4 4v2h16v-2a4 4 0 0 0-4-4z"/>
            </svg>
            ${isGenerateMode ? 'Generate Content' : 'Generate'}
          </button>
          <button class="btn btn-accent ai-edit-apply" style="display: none;">Apply Changes</button>
        </div>
      </div>
    `;
    
    // Store generate mode flag
    modal.dataset.generateMode = isGenerateMode ? 'true' : 'false';
    modal.dataset.contextInfo = contextInfo;

    document.body.appendChild(modal);

    // Store context
    modal.dataset.sectionId = sectionId;
    if (entryId) modal.dataset.entryId = entryId;

    // Event listeners
    const closeModal = () => modal.remove();
    modal.querySelector('.ai-edit-close').addEventListener('click', closeModal);
    modal.querySelector('.ai-edit-cancel').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Generate button
    modal.querySelector('.ai-edit-generate').addEventListener('click', async () => {
      const input = modal.querySelector('.ai-edit-input').value.trim();
      const isGenMode = modal.dataset.generateMode === 'true';
      
      // In edit mode, input is required. In generate mode, it's optional
      if (!isGenMode && !input) return;

      const generateBtn = modal.querySelector('.ai-edit-generate');
      generateBtn.disabled = true;
      generateBtn.innerHTML = '<span class="spinner"></span> Generating...';

      try {
        const result = await this.generateAiEdit(sectionId, currentContent, input, entryId, isGenMode, modal.dataset.contextInfo);
        
        modal.querySelector('.ai-edit-suggestion').textContent = result;
        modal.querySelector('.ai-edit-result').style.display = 'block';
        modal.querySelector('.ai-edit-apply').style.display = 'inline-flex';
        
        generateBtn.innerHTML = '🔄 Regenerate';
        generateBtn.disabled = false;
      } catch (error) {
        console.error('AI edit failed:', error);
        modal.querySelector('.ai-edit-suggestion').textContent = '⚠️ Failed to generate. Please try again.';
        modal.querySelector('.ai-edit-result').style.display = 'block';
        generateBtn.innerHTML = isGenMode ? 'Generate Content' : 'Generate';
        generateBtn.disabled = false;
      }
    });

    // Apply button
    modal.querySelector('.ai-edit-apply').addEventListener('click', () => {
      const newContent = modal.querySelector('.ai-edit-suggestion').textContent;
      this.applyAiEdit(sectionId, newContent, entryId);
      closeModal();
    });

    // Focus input
    modal.querySelector('.ai-edit-input').focus();
  }

  async generateAiEdit(sectionId, currentContent, userRequest, entryId = null, isGenerateMode = false, contextInfo = '') {
    let systemPrompt = '';
    let userPrompt = '';
    
    if (isGenerateMode) {
      // Generate mode - create new content from scratch
      if (sectionId === 'summary') {
        systemPrompt = `You are a German CV writing expert. Generate a professional summary (Berufliches Profil) in German for a CV. The summary should be 2-3 sentences, professional, and highlight experience and goals. Output ONLY the German text, no explanations.`;
        userPrompt = `Job title: ${contextInfo || 'Professional'}\n${userRequest ? `Additional details: ${userRequest}` : ''}`;
      } else if (sectionId === 'skills') {
        systemPrompt = `You are a German CV skills expert. Generate a list of relevant professional skills in German for a CV. Output ONLY comma-separated skills, no explanations.`;
        userPrompt = `Job title: ${contextInfo || 'Professional'}\n${userRequest ? `Focus on: ${userRequest}` : ''}`;
      } else if (sectionId === 'experience') {
        systemPrompt = `You are a German CV writing expert. Generate a professional job description in German for a CV. Include 3-4 bullet points with responsibilities and achievements. Use action verbs. Output ONLY the German text with bullet points (use - for bullets), no explanations.`;
        userPrompt = `Position: ${contextInfo || 'Professional role'}\n${userRequest ? `Include: ${userRequest}` : ''}`;
      }
    } else {
      // Edit mode - modify existing content
      if (sectionId === 'summary') {
        systemPrompt = `You are a German CV writing expert. Edit the professional summary based on the user's request. Output ONLY the new German text, no explanations.`;
      } else if (sectionId === 'skills') {
        systemPrompt = `You are a German CV skills expert. Edit the skills list based on the user's request. Output ONLY the comma-separated skills in German, no explanations.`;
      } else if (sectionId === 'experience') {
        systemPrompt = `You are a German CV writing expert. Edit the job description based on the user's request. Output ONLY the new German text with bullet points if appropriate, no explanations.`;
      }
      userPrompt = `Current text:\n${currentContent}\n\nUser request: ${userRequest}`;
    }

    // Use secure Edge Function if Supabase is configured
    if (isSupabaseConfigured()) {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];
      const response = await callOpenAI(messages, { temperature: 0.7 });
      return response.choices[0].message.content.trim();
    } else {
      // Fallback to direct API for development
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('cvprofi_openai_key') || '';
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      return data.choices[0].message.content.trim();
    }
  }

  applyAiEdit(sectionId, newContent, entryId = null) {
    if (sectionId === 'summary') {
      cvStore.setSummary(newContent);
    } else if (sectionId === 'skills') {
      // Parse comma-separated skills
      const newSkills = newContent.split(',').map(s => s.trim()).filter(Boolean);
      // Clear and set new skills
      cvStore.getSkills().forEach(s => cvStore.removeSkill(s));
      newSkills.forEach(s => cvStore.addSkill(s));
    } else if (sectionId === 'experience' && entryId) {
      cvStore.updateExperience(entryId, { description: newContent });
    }
  }

  // ==========================================
  // NEW JOB WIZARD (Chat-like guided flow)
  // ==========================================

  openNewJobWizard(entryId) {
    // Remove existing modal if any
    const existingModal = document.querySelector('.ai-edit-modal');
    if (existingModal) existingModal.remove();

    // Create wizard modal
    const modal = document.createElement('div');
    modal.className = 'ai-edit-modal';
    modal.innerHTML = `
      <div class="ai-edit-card ai-wizard-card">
        <div class="ai-edit-header">
          <h3>✨ Add New Job with AI</h3>
          <button class="ai-edit-close">&times;</button>
        </div>
        <div class="ai-wizard-body">
          <div class="wizard-step active" data-step="1">
            <div class="wizard-question">
              <span class="wizard-icon">💼</span>
              <span>What was your job title?</span>
            </div>
            <input type="text" class="wizard-input" id="wizard-title" placeholder="e.g., Software Engineer, Electrician, Nurse...">
          </div>
          <div class="wizard-step" data-step="2">
            <div class="wizard-question">
              <span class="wizard-icon">🏢</span>
              <span>Which company or organization?</span>
            </div>
            <input type="text" class="wizard-input" id="wizard-company" placeholder="e.g., Siemens, BMW, Local Hospital...">
          </div>
          <div class="wizard-step" data-step="3">
            <div class="wizard-question">
              <span class="wizard-icon">📅</span>
              <span>What time period?</span>
            </div>
            <input type="text" class="wizard-input" id="wizard-date" placeholder="e.g., Jan 2020 - Present, 2018 - 2022...">
          </div>
          <div class="wizard-step" data-step="4">
            <div class="wizard-question">
              <span class="wizard-icon">📝</span>
              <span>Any specific details for the description? (optional)</span>
            </div>
            <textarea class="wizard-input wizard-textarea" id="wizard-details" placeholder="e.g., Focus on leadership, mention team size, include specific projects..."></textarea>
          </div>
          <div class="wizard-step" data-step="5">
            <div class="wizard-generating">
              <div class="wizard-spinner"></div>
              <span>Generating professional job description...</span>
            </div>
          </div>
          <div class="wizard-step" data-step="6">
            <div class="wizard-result">
              <label>Generated Job Entry:</label>
              <div class="wizard-preview">
                <div class="wizard-preview-header">
                  <strong id="preview-title"></strong>
                  <span id="preview-date"></span>
                </div>
                <div id="preview-company"></div>
                <div id="preview-description"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="ai-edit-footer">
          <button class="btn btn-ghost ai-edit-cancel">Cancel</button>
          <button class="btn btn-primary wizard-next" id="wizard-next">
            Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
          <button class="btn btn-accent wizard-apply" id="wizard-apply" style="display: none;">Apply to CV</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.dataset.entryId = entryId;
    modal.dataset.currentStep = '1';

    // Close handlers
    const closeModal = () => modal.remove();
    modal.querySelector('.ai-edit-close').addEventListener('click', closeModal);
    modal.querySelector('.ai-edit-cancel').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Focus first input
    modal.querySelector('#wizard-title').focus();

    // Enter key to go next
    modal.querySelectorAll('.wizard-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          modal.querySelector('#wizard-next').click();
        }
      });
    });

    // Next button handler
    modal.querySelector('#wizard-next').addEventListener('click', async () => {
      const currentStep = parseInt(modal.dataset.currentStep);
      
      // Validate current step
      if (currentStep === 1) {
        const title = modal.querySelector('#wizard-title').value.trim();
        if (!title) {
          modal.querySelector('#wizard-title').focus();
          return;
        }
      } else if (currentStep === 2) {
        const company = modal.querySelector('#wizard-company').value.trim();
        if (!company) {
          modal.querySelector('#wizard-company').focus();
          return;
        }
      } else if (currentStep === 3) {
        const date = modal.querySelector('#wizard-date').value.trim();
        if (!date) {
          modal.querySelector('#wizard-date').focus();
          return;
        }
      }

      // Move to next step
      const nextStep = currentStep + 1;
      modal.dataset.currentStep = nextStep.toString();

      // Hide current, show next
      modal.querySelectorAll('.wizard-step').forEach(step => {
        step.classList.remove('active');
        if (parseInt(step.dataset.step) === nextStep) {
          step.classList.add('active');
        }
      });

      // Focus next input
      if (nextStep === 2) modal.querySelector('#wizard-company').focus();
      if (nextStep === 3) modal.querySelector('#wizard-date').focus();
      if (nextStep === 4) modal.querySelector('#wizard-details').focus();

      // Step 4 -> 5: Generate full job entry
      if (nextStep === 5) {
        const nextBtn = modal.querySelector('#wizard-next');
        nextBtn.style.display = 'none';

        const title = modal.querySelector('#wizard-title').value.trim();
        const company = modal.querySelector('#wizard-company').value.trim();
        const date = modal.querySelector('#wizard-date').value.trim();
        const details = modal.querySelector('#wizard-details').value.trim();

        try {
          // Generate full entry with enhanced title, company, date, and description
          const result = await this.generateFullJobEntry(title, company, date, details);
          
          // Show result with enhanced values
          modal.querySelector('#preview-title').textContent = result.title;
          modal.querySelector('#preview-company').textContent = result.company;
          modal.querySelector('#preview-date').textContent = result.date;
          modal.querySelector('#preview-description').textContent = result.description;

          // Store enhanced data
          modal.dataset.generatedTitle = result.title;
          modal.dataset.generatedCompany = result.company;
          modal.dataset.generatedDate = result.date;
          modal.dataset.generatedDescription = result.description;

          // Move to step 6
          modal.dataset.currentStep = '6';
          modal.querySelectorAll('.wizard-step').forEach(step => {
            step.classList.remove('active');
            if (step.dataset.step === '6') step.classList.add('active');
          });

          // Show apply button
          modal.querySelector('#wizard-apply').style.display = 'inline-flex';
          nextBtn.innerHTML = '🔄 Regenerate';
          nextBtn.style.display = 'inline-flex';
          
        } catch (error) {
          console.error('Failed to generate:', error);
          modal.querySelector('.wizard-generating span').textContent = '⚠️ Failed. Please try again.';
          nextBtn.innerHTML = 'Retry';
          nextBtn.style.display = 'inline-flex';
          modal.dataset.currentStep = '4';
        }
      }

      // Regenerate from step 6
      if (currentStep === 6) {
        modal.dataset.currentStep = '5';
        modal.querySelectorAll('.wizard-step').forEach(step => {
          step.classList.remove('active');
          if (step.dataset.step === '5') step.classList.add('active');
        });
        modal.querySelector('.wizard-generating span').textContent = 'Generating professional job description...';
        modal.querySelector('#wizard-apply').style.display = 'none';
        modal.querySelector('#wizard-next').style.display = 'none';
        
        // Trigger generation again
        setTimeout(() => modal.querySelector('#wizard-next').click(), 100);
      }
    });

    // Apply button handler
    modal.querySelector('#wizard-apply').addEventListener('click', () => {
      const entryId = modal.dataset.entryId;
      cvStore.updateExperience(entryId, {
        title: modal.dataset.generatedTitle,
        company: modal.dataset.generatedCompany,
        date: modal.dataset.generatedDate,
        description: modal.dataset.generatedDescription,
      });
      closeModal();
    });
  }

  async generateFullJobEntry(title, company, date, details = '') {
    const systemPrompt = `You are a German CV writing expert. Generate a complete job entry for a German CV.

You must return a JSON object with these fields:
- "title": The job title in proper German (capitalized, professional)
- "company": The company name properly formatted
- "date": The date range formatted for German CV (e.g., "Jan 2020 - Heute" or "2018 - 2022")
- "description": A SHORT job description with 2-3 bullet points only. Keep it concise. Use - for bullets.

Return ONLY valid JSON, no explanations.`;

    const userPrompt = `User input:
Job title: ${title}
Company: ${company}
Time period: ${date}
${details ? `Additional details: ${details}` : ''}

Please enhance and format this for a professional German CV.`;

    // Use secure Edge Function if Supabase is configured
    if (isSupabaseConfigured()) {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];
      const response = await callOpenAI(messages, { temperature: 0.7, response_format: { type: 'json_object' } });
      return JSON.parse(response.choices[0].message.content);
    } else {
      // Fallback to direct API for development
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('cvprofi_openai_key') || '';
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        }),
      });
      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    }
  }
}

export default CVEditor;
