// Simple JSON-file storage for the HEU Digital Library.
// No SQL database or native build tools are required.
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'library-data.json');
fs.mkdirSync(dataDir, { recursive: true });

function seedData() {
  const now = new Date().toISOString();
  return {
    nextIds: { users: 3, books: 5, borrowings: 1 },
    users: [
      { id: 1, student_id: null, name: 'Library Administrator', email: 'librarian@library.local', password_hash: bcrypt.hashSync('Admin123!', 10), role: 'librarian', created_at: now },
      { id: 2, student_id: 'STU-1001', name: 'Sample Student', email: 'student@library.local', password_hash: bcrypt.hashSync('Student123!', 10), role: 'student', created_at: now }
    ],
    books: [
      { id: 1, isbn: '9780140328721', title: 'Matilda', author: 'Roald Dahl', publisher: '', category: 'Fiction', published_year: 1988, total_copies: 4, available_copies: 4, created_at: now },
      { id: 2, isbn: '9780132350884', title: 'Clean Code', author: 'Robert C. Martin', publisher: '', category: 'Technology', published_year: 2008, total_copies: 3, available_copies: 3, created_at: now },
      { id: 3, isbn: '9780061120084', title: 'To Kill a Mockingbird', author: 'Harper Lee', publisher: '', category: 'Fiction', published_year: 1960, total_copies: 2, available_copies: 2, created_at: now },
      { id: 4, isbn: '9780596007126', title: 'Head First Design Patterns', author: 'Eric Freeman et al.', publisher: '', category: 'Technology', published_year: 2004, total_copies: 2, available_copies: 2, created_at: now }
    ],
    borrowings: []
  };
}

let data;
try {
  data = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : seedData();
} catch (error) {
  console.error('Could not read library-data.json. A fresh data file will be created.', error);
  data = seedData();
}
function save() {
  const tempFile = `${dataFile}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempFile, dataFile);
}
if (!fs.existsSync(dataFile)) save();

function nextId(collection) {
  const id = data.nextIds[collection] || 1;
  data.nextIds[collection] = id + 1;
  return id;
}
function all(collection) { return data[collection]; }
function find(collection, id) { return data[collection].find(row => row.id === Number(id)); }
function insert(collection, record) {
  const row = { id: nextId(collection), ...record };
  data[collection].push(row); save(); return row;
}
function update(collection, id, changes) {
  const row = find(collection, id);
  if (!row) return null;
  Object.assign(row, changes); save(); return row;
}
function remove(collection, id) {
  const index = data[collection].findIndex(row => row.id === Number(id));
  if (index < 0) return false;
  data[collection].splice(index, 1); save(); return true;
}
function count(collection, predicate = () => true) { return data[collection].filter(predicate).length; }
function unique(collection, field) { return [...new Set(data[collection].map(row => row[field]).filter(Boolean))].sort((a,b) => String(a).localeCompare(String(b))); }

module.exports = { all, find, insert, update, remove, count, unique, save, dataFile };
