# HEU Digital Library Management System

A simple web-based library management application built with React JS (Vite) and Node.js + Express.js. The backend stores all records in a local JSON file, so SQLite, better-sqlite3, and native build tools are not needed.

## Main features
- Librarian and student sign-in
- Dashboard statistics
- Book catalog: add, view, edit, delete, and search books
- Catalog categories, authors, publishers, and ebook catalog section
- Member management for student and librarian accounts
- Borrowing and book return management
- Dedicated Returning Books page showing active loans, overdue items, and a Return action
- Circulation history showing completed returns and return dates
- Automatic available-copy update when a book is returned
- Persistent JSON storage in `backend/data/library-data.json`
- HEU school seal and responsive sidebar navigation

## Requirements
- Node.js (LTS recommended)
- npm
- Visual Studio Code

## Installation and run
Open the project folder in VS Code. Use two separate terminals.

### Terminal 1 — Backend
```bash
cd backend
npm install
node server.js
```
Backend API: http://localhost:5000/api
Health check: http://localhost:5000/api/health

### Terminal 2 — Frontend
```bash
cd frontend
npm install
npm run dev
```
Open the Vite URL printed in the terminal, usually http://localhost:5173.

## Demo accounts
- Librarian: `librarian@library.local` / `Admin123!`
- Student: `student@library.local` / `Student123!`

## Data storage
The backend automatically creates `backend/data/library-data.json` on first start. It contains users, books, and borrowing records. Keep this file to preserve your records. Back it up regularly. Do not store real sensitive personal information in this classroom demo without adding appropriate security and deployment controls.

## Project structure
```text
digital-library-management-system/
  backend/
    data/                 # created automatically; JSON records
    database.js           # JSON storage functions (not SQL)
    server.js              # Express API and business logic
    package.json
  frontend/
    public/heu-logo.png
    src/App.jsx
    src/App.css
    src/main.jsx
    package.json
  README.md
```
