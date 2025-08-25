# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/1343f73b-7d41-45cd-bb9e-f3e99c9d3b4d

## SMGTS — Simple Sales & Inventory (local dev)

A small Vite + React frontend with a TypeScript Express + Mongoose backend for sales and inventory management.

This README gives the minimum steps to run the project locally and mentions the seeded accounts used for development.

### Tech stack
- Frontend: Vite, React, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Node.js, Express, TypeScript, Mongoose (MongoDB)

### Quick start (Windows PowerShell)
1. Install dependencies (root contains the frontend):

```powershell
cd "C:\Users\USER\Downloads\SMGTS"
npm install
```

2. Install backend deps and run backend (separate terminal):

```powershell
cd backend
npm install
# dev: npm run dev or start with npm start
npm run dev
```

3. Run frontend (root):

```powershell
cd "C:\Users\USER\Downloads\SMGTS"
npm run dev
```

By default the backend runs on port 5000 and the frontend on Vite's default (usually 5173).

### Seed data
- Run the backend seed script to create sample data and two users:

```powershell
cd backend
npm run seed
```

- Seeded accounts (development):
	- admin@test.com / password123 (role: admin)
	- agent@test.com / password123 (role: agent)

The seed logic lives in `backend/src/scripts/seed.ts`.

### Environment
Create a `.env` for the backend (example variables):

- MONGO_URI (MongoDB connection string)
- JWT_SECRET (JWT signing secret)
- JWT_EXPIRES_IN (e.g. "7d")
- CLIENT_ORIGIN (frontend origin for CORS)

Example `.env` (do not commit real secrets):

```
MONGO_URI=mongodb://localhost:27017/sales_mgmt
JWT_SECRET=devsecret
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
```

### Notes
- Products have server-generated SKUs; the frontend creates products without providing `sku`.
- If you reseed the database, previously issued JWTs may become invalid (tokens encode user id). Re-login after reseeding.

### Contributing / pushing
- A `.gitignore` is present to avoid committing node_modules, env files, logs and build artifacts.
- To push this repository to GitHub, set the remote and push the `main` branch.

If you'd like, I can add more documentation (API reference, scripts, or a short development checklist).
