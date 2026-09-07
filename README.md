# PPOAF Teachers Assessment

A teacher competency assessment, gap diagnosis and personalised upskilling platform for PPOAF.

Planned applications:
- Web application
- Backend API
- Mobile application

The system will eventually support teacher assessment, competency scoring, gap diagnosis, personalised learning recommendations, courses, progress tracking and administrative management.

Development will be completed step by step.

---

## Development Progress

### Step 1 - Project Structure (Complete)
Initial folder structure created: `web/`, `server/`, `mobile/`.

### Step 2 - Web Application Initialized (Complete)
The web application has been initialised inside `web/`.

### Step 3 - PPOAF-Branded Public Website Built (Complete)
Built the complete, responsive, PPOAF-branded public website matching the foundation's visual identity with the official logo, warm neutral palette, deep navy blue primary accents, and crimson highlights.

### Step 4 - Teacher Experience UI Built (Complete)
Built the dedicated teacher portal experience UI, including the teacher workspace layout, profile & context forms, assessment introduction, demo assessment question interface, results preview, learning hub, growth plan architecture, and reassessment workflow.

### Step 5 - Backend Foundation Established (Complete)
Initialized the backend service inside `server/` using Node.js, Express.js, TypeScript, Mongoose, CORS, and dotenv. Built isolated MongoDB connection handling, centralized error handling, environment templates, and the `/api/health` monitoring endpoint.

---

## Running the Applications

### Frontend Web App
```bash
cd web
npm run dev
```

### Backend API Server
```bash
cd server
npm run dev
```

To build both for production:
```bash
# Frontend
cd web && npm run build

# Backend
cd server && npm run build
```
"# ppoafteachersassessment" 
