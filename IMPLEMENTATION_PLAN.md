# CVprofi Implementation Plan

## ✅ IMPLEMENTATION COMPLETE

This document tracks the implementation progress for CVprofi enhancements.

---

## Current State (After Implementation)

### Features (Working)
- AI-guided CV creation with multi-language chat (16 languages)
- OpenAI-powered translation & enhancement to German CV
- 3 CV templates (Modern, Professional, Creative)
- Live editing and preview
- PDF export via browser print
- **NEW**: API key via environment variable (`.env.local`)
- **NEW**: Supabase database integration
- **NEW**: User authentication (sign up, sign in, sign out)
- **NEW**: Landing page with marketing content
- **NEW**: Dashboard for CV management
- **NEW**: Auto-save and manual save to database
- **NEW**: Multi-page app structure

### Tech Stack
- **Frontend**: Vanilla JavaScript + Vite (multi-page)
- **Styling**: Custom CSS
- **State**: Custom event-based store (`cvData.js`)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth

---

## Implementation Phases

### ✅ Phase 1: Environment Configuration & API Key Migration (COMPLETED)
**Goal**: Move API keys from localStorage/settings modal to `.env.local`

**Completed Files:**
- `.env.example` - Template for environment variables
- `src/lib/supabase.js` - Supabase client initialization
- `src/openai.js` - Updated to use env variables with localStorage fallback
- `src/main.js` - Updated settings modal to show env status

#### Tasks:
1. **Create `.env.example`** with required variables:
   ```
   VITE_OPENAI_API_KEY=sk-...
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

2. **Update `openai.js`**:
   - Read API key from `import.meta.env.VITE_OPENAI_API_KEY`
   - Remove localStorage getter/setter for API key
   - Keep fallback to localStorage for development flexibility

3. **Update `main.js`**:
   - Remove settings modal for API key (or repurpose for user preferences)
   - Show warning if API key not configured in env

4. **Update `index.html`**:
   - Remove or repurpose the settings modal

---

### ✅ Phase 2: Supabase Database Setup (COMPLETED)
**Goal**: Persist CVs and user data in Supabase

**Completed Files:**
- `supabase/schema.sql` - Complete database schema with RLS policies
- `src/services/cvService.js` - CV CRUD operations
- `src/services/authService.js` - Authentication functions

#### Database Schema:

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CVs table
CREATE TABLE cvs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled CV',
  template_id TEXT DEFAULT 'modern',
  data JSONB NOT NULL, -- Full CV data (personal, summary, experience, etc.)
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CV Templates (for premium/custom templates)
CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  preview_url TEXT,
  css_class TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default templates
INSERT INTO templates (id, name, description, css_class, is_premium) VALUES
  ('modern', 'Modern', 'Clean & Minimalist', 'cv-template-modern', FALSE),
  ('professional', 'Professional', 'Classic & Formal', 'cv-template-professional', FALSE),
  ('creative', 'Creative', 'Two-Column Accent', 'cv-template-creative', FALSE);
```

#### Tasks:
1. **Create `src/lib/supabase.js`**:
   - Initialize Supabase client with env variables
   - Export client instance

2. **Create `src/services/cvService.js`**:
   - `saveCv(cvData)` - Save/update CV to database
   - `loadCv(cvId)` - Load CV by ID
   - `listCvs(userId)` - List user's CVs
   - `deleteCv(cvId)` - Delete CV

3. **Update `cvData.js`**:
   - Add auto-save functionality (debounced)
   - Add load from database method
   - Track dirty state

---

### ✅ Phase 3: Authentication (COMPLETED)
**Goal**: User registration, login, and session management

**Completed Files:**
- `src/services/authService.js` - Full auth service (signUp, signIn, signOut, etc.)
- `landing.html` - Auth modal with login/signup forms
- `src/landing.js` - Auth modal handling and form submission

#### Tasks:
1. **Create `src/services/authService.js`**:
   - `signUp(email, password)`
   - `signIn(email, password)`
   - `signOut()`
   - `getCurrentUser()`
   - `onAuthStateChange(callback)`

2. **Create `src/components/AuthModal.js`**:
   - Login form
   - Registration form
   - Password reset
   - Social login (Google, optional)

3. **Update `index.html`**:
   - Add auth modal markup
   - Add user menu in header (avatar, dropdown)

4. **Update `main.js`**:
   - Check auth state on load
   - Show auth modal for protected actions
   - Update header UI based on auth state

5. **Guest Mode**:
   - Allow CV creation without login
   - Prompt to save/login before leaving
   - Store guest CV in localStorage temporarily

---

### ✅ Phase 4: Landing Page (COMPLETED)
**Goal**: Marketing landing page with features, pricing, and CTA

**Completed Files:**
- `landing.html` - Full marketing landing page
- `src/styles/landing.css` - Landing page styles
- `src/landing.js` - Landing page scripts and auth handling

#### Structure:
```
/                 → Landing page (new)
/app              → CV editor (current functionality)
/login            → Auth page
/dashboard        → User's CVs list
```

#### Tasks:
1. **Create `landing.html`** (or convert to SPA routing):
   - Hero section with headline & CTA
   - Features section (AI-powered, multi-language, German CV)
   - How it works (3 steps)
   - Template showcase
   - Testimonials (placeholder)
   - Pricing section (Free tier + Premium)
   - Footer

2. **Create `src/styles/landing.css`**:
   - Modern, responsive design
   - Consistent with app branding

3. **Routing Options**:
   - **Option A**: Multi-page (landing.html, index.html for app)
   - **Option B**: SPA with hash routing
   - **Recommended**: Option A for simplicity, SEO benefits

---

### ⏳ Phase 5: Template System Enhancement (FUTURE)
**Goal**: More templates, template preview, and premium templates

#### Tasks:
1. **Create additional templates**:
   - `executive` - Senior/executive style
   - `minimal` - Ultra-clean, lots of whitespace
   - `academic` - For academic/research CVs
   - `technical` - For developers/engineers

2. **Create `src/styles/templates.css`**:
   - Separate CSS for each template
   - Print-optimized styles

3. **Update `editor.js`**:
   - Dynamic template loading
   - Template preview thumbnails
   - Premium template indicators

4. **Template customization** (future):
   - Color scheme picker
   - Font selection
   - Section ordering

---

### ✅ Phase 6: Dashboard & CV Management (COMPLETED)
**Goal**: User dashboard to manage multiple CVs

**Completed Files:**
- `dashboard.html` - Dashboard page with CV grid
- `src/styles/dashboard.css` - Dashboard styles
- `src/dashboard.js` - Dashboard scripts (load, delete, duplicate CVs)

#### Tasks:
1. **Create `dashboard.html`** or dashboard view:
   - List of user's CVs with thumbnails
   - Create new CV button
   - Edit, duplicate, delete actions
   - Last edited timestamp

2. **Create `src/dashboard.js`**:
   - Load user's CVs
   - CV card rendering
   - CRUD operations

---

### ⏳ Phase 7: Additional Features (Future)

#### 7.1 PDF Export Enhancement
- Use `html2pdf.js` or `jsPDF` for better PDF generation
- Multiple page support
- Consistent styling across browsers

#### 7.2 CV Sharing
- Public CV links
- Custom slugs (username/cv-name)
- QR code generation

#### 7.3 Import/Export
- Import from LinkedIn
- Export to DOCX
- JSON export/import

#### 7.4 Analytics
- Track CV views (for public CVs)
- Download counts

---

## File Structure (After Implementation)

```
lebenslauf-antigravity/
├── .env.local              # API keys (gitignored)
├── .env.example            # Template for env vars
├── index.html              # Landing page
├── app.html                # CV editor app
├── dashboard.html          # User dashboard
├── package.json
├── vite.config.js          # Vite configuration
├── public/
│   └── assets/             # Static assets
├── src/
│   ├── main.js             # App entry point
│   ├── landing.js          # Landing page scripts
│   ├── dashboard.js        # Dashboard scripts
│   ├── chat.js             # AI chat engine
│   ├── editor.js           # CV editor
│   ├── cvData.js           # State management
│   ├── openai.js           # OpenAI service
│   ├── enhancer.js         # Text enhancement
│   ├── i18n.js             # Translations
│   ├── lib/
│   │   └── supabase.js     # Supabase client
│   ├── services/
│   │   ├── authService.js  # Authentication
│   │   └── cvService.js    # CV CRUD operations
│   ├── components/
│   │   ├── AuthModal.js    # Login/Register modal
│   │   └── UserMenu.js     # Header user menu
│   └── styles/
│       ├── main.css        # Global styles
│       ├── chat.css        # Chat panel styles
│       ├── editor.css      # Editor styles
│       ├── landing.css     # Landing page styles
│       ├── dashboard.css   # Dashboard styles
│       └── templates.css   # CV template styles
```

---

## Implementation Order (Recommended)

1. **Phase 1**: Environment Configuration (1-2 hours)
2. **Phase 2**: Database Setup (2-3 hours)
3. **Phase 3**: Authentication (3-4 hours)
4. **Phase 4**: Landing Page (3-4 hours)
5. **Phase 5**: Template Enhancement (2-3 hours)
6. **Phase 6**: Dashboard (2-3 hours)

**Total Estimated Time**: 13-19 hours

---

## Questions Before Starting

1. **Routing preference**: Multi-page HTML or SPA with client-side routing?
2. **Auth providers**: Email/password only, or also Google/GitHub OAuth?
3. **Premium features**: Do you want to implement a paywall for premium templates?
4. **Hosting**: Where will this be deployed? (Vercel, Netlify, etc.)
5. **Priority**: Which phase should we start with first?

---

## Ready to Start?

Let me know which phase you'd like to begin with, or if you have any modifications to this plan!
