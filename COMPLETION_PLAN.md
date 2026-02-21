# CVprofi App Completion Plan

## Overview
This document outlines the implementation plan to complete CVprofi as a production-ready application.

**Key Principle**: All user-facing strings will use i18n keys for easy translation later.

---

## ✅ COMPLETION STATUS

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Toast notification system | ✅ Complete |
| 2 | Settings/Account page | ✅ Complete |
| 3 | Form validation | ✅ Complete |
| 4 | Mobile responsive fixes | ✅ Complete |
| 5 | Better PDF export (html2pdf.js) | ✅ Complete |
| 6 | Edit existing letters | ✅ Complete |
| 7 | Custom CV sections (data model) | ✅ Complete |
| 8 | Onboarding tour | ⏸️ Deferred |
| 9 | GDPR compliance | ✅ Complete |
| 10 | Error tracking | ✅ Complete |

---

## Phase 1: Toast Notification System (2h)
**Goal**: Replace all `alert()` calls with a proper toast notification system.

### Tasks:
- [ ] Create `src/toast.js` - Toast manager with i18n support
- [ ] Create toast CSS in `src/styles/toast.css`
- [ ] Add toast container to all HTML pages
- [ ] Add toast i18n keys to `src/i18n.js`
- [ ] Replace all `alert()` calls across the app

### i18n Keys to Add:
```
toast_success, toast_error, toast_info, toast_warning
toast_cv_saved, toast_cv_deleted, toast_cv_duplicated
toast_letter_saved, toast_letter_deleted, toast_letter_copied
toast_copy_success, toast_login_success, toast_logout_success
toast_error_generic, toast_error_network, toast_error_auth
```

---

## Phase 2: Settings/Account Page (4h)
**Goal**: User can manage their profile and account settings.

### Tasks:
- [ ] Create `settings.html` - Account settings page
- [ ] Create `src/settings.js` - Settings page logic
- [ ] Create `src/styles/settings.css` - Settings page styles
- [ ] Add settings link to dashboard header
- [ ] Implement profile update (name)
- [ ] Implement password change
- [ ] Implement account deletion (GDPR)
- [ ] Add settings i18n keys

### i18n Keys to Add:
```
settings_title, settings_profile, settings_security, settings_danger
settings_name, settings_email, settings_save_changes
settings_change_password, settings_current_password, settings_new_password
settings_delete_account, settings_delete_warning, settings_delete_confirm
```

---

## Phase 3: Form Validation (2h)
**Goal**: Proper validation with user-friendly error messages.

### Tasks:
- [ ] Create `src/validation.js` - Validation utilities
- [ ] Add validation to CV editor fields
- [ ] Add validation to auth forms
- [ ] Add validation to letter modal
- [ ] Show inline error messages (i18n)

### i18n Keys to Add:
```
validation_required, validation_email_invalid, validation_phone_invalid
validation_date_invalid, validation_url_invalid, validation_min_length
validation_password_weak, validation_passwords_mismatch
```

---

## Phase 4: Mobile Responsive Fixes (4h)
**Goal**: App works well on mobile devices.

### Tasks:
- [ ] Fix editor layout on mobile (stack panels)
- [ ] Fix chat panel on mobile (full screen)
- [ ] Fix template preview on mobile
- [ ] Fix dashboard cards on mobile
- [ ] Fix letter modal on mobile
- [ ] Add mobile navigation menu
- [ ] Test on various screen sizes

---

## Phase 5: Better PDF Export (3h)
**Goal**: High-quality PDF export without browser print dialog.

### Tasks:
- [ ] Install html2pdf.js via CDN or npm
- [ ] Create PDF export service
- [ ] Add download button (not just print)
- [ ] Ensure all templates export correctly
- [ ] Add loading state during export
- [ ] Add PDF export for letters

### i18n Keys to Add:
```
export_pdf, export_downloading, export_success, export_error
```

---

## Phase 6: Edit Existing Letters (2h)
**Goal**: Users can edit saved motivational letters.

### Tasks:
- [ ] Add edit button to letter cards
- [ ] Open letter modal in edit mode
- [ ] Pre-fill form with existing data
- [ ] Update letter on save (not create new)
- [ ] Add edit i18n keys

### i18n Keys to Add:
```
letter_edit, letter_update, letter_updated
```

---

## Phase 7: Custom CV Sections (4h)
**Goal**: Users can add certifications, projects, hobbies.

### Tasks:
- [ ] Add section types to CV data model
- [ ] Create UI for adding custom sections
- [ ] Implement section reordering (drag & drop optional)
- [ ] Update all templates to render custom sections
- [ ] Add section i18n keys

### i18n Keys to Add:
```
section_certifications, section_projects, section_hobbies, section_custom
add_section, remove_section, section_title
```

---

## Phase 8: Onboarding Tour (3h)
**Goal**: Guide new users through the app.

### Tasks:
- [ ] Create `src/onboarding.js` - Tour manager
- [ ] Create tour CSS styles
- [ ] Define tour steps for CV editor
- [ ] Show tour on first visit (localStorage flag)
- [ ] Add skip/next/done buttons
- [ ] Add onboarding i18n keys

### i18n Keys to Add:
```
onboarding_welcome, onboarding_step1, onboarding_step2, ...
onboarding_skip, onboarding_next, onboarding_done
```

---

## Phase 9: GDPR Compliance (3h)
**Goal**: Legal compliance for German/EU market.

### Tasks:
- [ ] Create `privacy.html` - Privacy policy page
- [ ] Create `terms.html` - Terms of service page
- [ ] Create `imprint.html` - Impressum (required in Germany)
- [ ] Add cookie consent banner (if needed)
- [ ] Add links to footer on all pages
- [ ] Implement data export (download my data)
- [ ] Account deletion already in Phase 2

### i18n Keys to Add:
```
privacy_policy, terms_of_service, imprint
cookie_consent, cookie_accept, cookie_decline
download_my_data
```

---

## Phase 10: Error Tracking (1h)
**Goal**: Monitor errors in production.

### Tasks:
- [ ] Add Sentry SDK (or similar)
- [ ] Configure error boundaries
- [ ] Add user context to errors
- [ ] Test error reporting

---

## Implementation Order

| Day | Phases | Est. Time |
|-----|--------|-----------|
| 1 | Phase 1 (Toast) + Phase 3 (Validation) | 4h |
| 2 | Phase 2 (Settings) | 4h |
| 3 | Phase 4 (Mobile) | 4h |
| 4 | Phase 5 (PDF) + Phase 6 (Edit Letters) | 5h |
| 5 | Phase 7 (Custom Sections) | 4h |
| 6 | Phase 8 (Onboarding) + Phase 9 (GDPR) | 6h |
| 7 | Phase 10 (Error Tracking) + Testing | 3h |

**Total Estimated Time: ~30 hours**

---

## i18n Strategy

All new strings will follow this pattern:

```javascript
// In i18n.js, add to each language:
ui: {
    toast_success: "Success!",
    toast_error: "An error occurred",
    settings_title: "Settings",
    // ... etc
}

// Usage in code:
import { getTranslations } from './i18n.js';
const t = getTranslations(currentLang);
showToast(t.ui.toast_success);
```

This keeps all strings centralized and easy to translate later.
