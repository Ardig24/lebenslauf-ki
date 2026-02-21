/**
 * CV Data Store — Central state management with event-based updates
 */

const DEFAULT_DATA = {
  personal: {
    firstName: '',
    lastName: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    photo: '', // Base64 encoded photo
  },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  languages: [],
  certifications: [], // { id, name, issuer, date, url }
  projects: [], // { id, name, description, technologies, url }
  hobbies: [], // Array of strings
  templateId: 'modern',
  accentColor: 'emerald', // emerald, blue, purple, rose, orange, slate, teal, indigo
};

class CVDataStore {
  constructor() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.listeners = new Map();
  }

  /**
   * Subscribe to changes on a specific section or '*' for all
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => {
      const arr = this.listeners.get(event);
      const idx = arr.indexOf(callback);
      if (idx > -1) arr.splice(idx, 1);
    };
  }

  emit(event, data) {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach(fn => fn(data));
    const allHandlers = this.listeners.get('*') || [];
    allHandlers.forEach(fn => fn({ event, data }));
  }

  // --- Personal Info ---
  setPersonal(field, value) {
    this.data.personal[field] = value;
    this.emit('personal', this.data.personal);
  }

  setPersonalBulk(obj) {
    Object.assign(this.data.personal, obj);
    this.emit('personal', this.data.personal);
  }

  getPersonal() {
    return { ...this.data.personal };
  }

  // --- Summary ---
  setSummary(text) {
    this.data.summary = text;
    this.emit('summary', this.data.summary);
  }

  getSummary() {
    return this.data.summary;
  }

  // --- Experience ---
  addExperience(entry) {
    const id = Date.now().toString();
    this.data.experience.push({ id, ...entry });
    this.emit('experience', this.data.experience);
    return id;
  }

  updateExperience(id, updates) {
    const idx = this.data.experience.findIndex(e => e.id === id);
    if (idx > -1) {
      Object.assign(this.data.experience[idx], updates);
      this.emit('experience', this.data.experience);
    }
  }

  removeExperience(id) {
    this.data.experience = this.data.experience.filter(e => e.id !== id);
    this.emit('experience', this.data.experience);
  }

  getExperience() {
    return [...this.data.experience];
  }

  // --- Education ---
  addEducation(entry) {
    const id = Date.now().toString();
    this.data.education.push({ id, ...entry });
    this.emit('education', this.data.education);
    return id;
  }

  updateEducation(id, updates) {
    const idx = this.data.education.findIndex(e => e.id === id);
    if (idx > -1) {
      Object.assign(this.data.education[idx], updates);
      this.emit('education', this.data.education);
    }
  }

  removeEducation(id) {
    this.data.education = this.data.education.filter(e => e.id !== id);
    this.emit('education', this.data.education);
  }

  getEducation() {
    return [...this.data.education];
  }

  // --- Skills ---
  addSkill(skill) {
    if (skill && !this.data.skills.includes(skill)) {
      this.data.skills.push(skill);
      this.emit('skills', this.data.skills);
    }
  }

  removeSkill(skill) {
    this.data.skills = this.data.skills.filter(s => s !== skill);
    this.emit('skills', this.data.skills);
  }

  setSkills(skills) {
    this.data.skills = [...skills];
    this.emit('skills', this.data.skills);
  }

  getSkills() {
    return [...this.data.skills];
  }

  // --- Languages ---
  addLanguage(lang) {
    const id = Date.now().toString();
    this.data.languages.push({ id, ...lang });
    this.emit('languages', this.data.languages);
    return id;
  }

  removeLanguage(id) {
    this.data.languages = this.data.languages.filter(l => l.id !== id);
    this.emit('languages', this.data.languages);
  }

  updateLanguage(id, updates) {
    const idx = this.data.languages.findIndex(l => l.id === id);
    if (idx > -1) {
      Object.assign(this.data.languages[idx], updates);
      this.emit('languages', this.data.languages);
    }
  }

  getLanguages() {
    return [...this.data.languages];
  }

  // --- Certifications ---
  addCertification(entry) {
    const id = Date.now().toString();
    this.data.certifications.push({ id, ...entry });
    this.emit('certifications', this.data.certifications);
    return id;
  }

  updateCertification(id, updates) {
    const idx = this.data.certifications.findIndex(e => e.id === id);
    if (idx > -1) {
      Object.assign(this.data.certifications[idx], updates);
      this.emit('certifications', this.data.certifications);
    }
  }

  removeCertification(id) {
    this.data.certifications = this.data.certifications.filter(e => e.id !== id);
    this.emit('certifications', this.data.certifications);
  }

  getCertifications() {
    return [...this.data.certifications];
  }

  // --- Projects ---
  addProject(entry) {
    const id = Date.now().toString();
    this.data.projects.push({ id, ...entry });
    this.emit('projects', this.data.projects);
    return id;
  }

  updateProject(id, updates) {
    const idx = this.data.projects.findIndex(e => e.id === id);
    if (idx > -1) {
      Object.assign(this.data.projects[idx], updates);
      this.emit('projects', this.data.projects);
    }
  }

  removeProject(id) {
    this.data.projects = this.data.projects.filter(e => e.id !== id);
    this.emit('projects', this.data.projects);
  }

  getProjects() {
    return [...this.data.projects];
  }

  // --- Hobbies ---
  setHobbies(hobbies) {
    this.data.hobbies = [...hobbies];
    this.emit('hobbies', this.data.hobbies);
  }

  addHobby(hobby) {
    if (hobby && !this.data.hobbies.includes(hobby)) {
      this.data.hobbies.push(hobby);
      this.emit('hobbies', this.data.hobbies);
    }
  }

  removeHobby(hobby) {
    this.data.hobbies = this.data.hobbies.filter(h => h !== hobby);
    this.emit('hobbies', this.data.hobbies);
  }

  getHobbies() {
    return [...this.data.hobbies];
  }

  // --- Template ---
  setTemplate(id) {
    this.data.templateId = id;
    this.emit('template', this.data.templateId);
  }

  getTemplate() {
    return this.data.templateId;
  }

  // --- Accent Color ---
  setAccentColor(color) {
    this.data.accentColor = color;
    this.emit('accentColor', this.data.accentColor);
  }

  getAccentColor() {
    return this.data.accentColor || 'emerald';
  }

  // --- Full Data ---
  getData() {
    return JSON.parse(JSON.stringify(this.data));
  }

  reset() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.emit('reset', this.data);
  }
}

export const cvStore = new CVDataStore();
export default cvStore;
