require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const store = require('./database');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || 'heu-library-development-secret-change-before-deployment';
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

const safeUser = user => ({ id: user.id, student_id: user.student_id, name: user.name, email: user.email, role: user.role, created_at: user.created_at });
const validId = value => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const today = () => new Date().toISOString().slice(0, 10);
const dateTime = () => new Date().toISOString();
const duplicateEmail = (email, exceptId) => store.all('users').some(user => user.email.toLowerCase() === email.toLowerCase() && user.id !== exceptId);
const duplicateStudentId = (studentId, exceptId) => studentId && store.all('users').some(user => user.student_id === studentId && user.id !== exceptId);
const duplicateIsbn = (isbn, exceptId) => isbn && store.all('books').some(book => book.isbn === isbn && book.id !== exceptId);

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Your session has expired. Please sign in again.' }); }
}
function librarianOnly(req, res, next) {
  if (req.user.role !== 'librarian') return res.status(403).json({ error: 'Librarian access is required for this action.' });
  next();
}
function borrowingView(row) {
  const book = store.find('books', row.book_id);
  const user = store.find('users', row.user_id);
  if (!book || !user) return null;
  return { ...row, book_title: book.title, book_author: book.author, isbn: book.isbn, borrower_name: user.name, borrower_email: user.email, student_id: user.student_id, is_overdue: row.status === 'borrowed' && row.due_date < today() };
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'HEU Digital Library API', storage: 'JSON file' }));
app.post('/api/auth/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  const user = store.all('users').find(item => item.email.toLowerCase() === email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Incorrect email or password.' });
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: safeUser(user) });
});
app.get('/api/auth/me', auth, (req, res) => {
  const user = store.find('users', req.user.id);
  if (!user) return res.status(401).json({ error: 'Account not found.' });
  res.json({ user: safeUser(user) });
});

app.get('/api/dashboard', auth, (req, res) => {
  const books = store.all('books'); const borrowings = store.all('borrowings');
  res.json({ books: books.length, copies: books.reduce((n,b) => n + b.total_copies, 0), available: books.reduce((n,b) => n + b.available_copies, 0), active: borrowings.filter(b => b.status === 'borrowed').length, overdue: borrowings.filter(b => b.status === 'borrowed' && b.due_date < today()).length, users: req.user.role === 'librarian' ? store.count('users', u => u.role === 'student') : null });
});

app.get('/api/books', auth, (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const books = store.all('books').filter(book => [book.title, book.author, book.isbn, book.category, book.publisher].some(value => String(value || '').toLowerCase().includes(q))).sort((a,b) => a.title.localeCompare(b.title));
  res.json({ books });
});
app.post('/api/books', auth, librarianOnly, (req, res) => {
  const { isbn, title, author, publisher, category, published_year, total_copies } = req.body;
  const copies = Number(total_copies); const cleanIsbn = String(isbn || '').trim();
  if (!String(title || '').trim() || !String(author || '').trim()) return res.status(400).json({ error: 'Book title and author are required.' });
  if (!Number.isInteger(copies) || copies < 0) return res.status(400).json({ error: 'Total copies must be a whole number of zero or more.' });
  if (duplicateIsbn(cleanIsbn)) return res.status(409).json({ error: 'That ISBN already exists.' });
  const book = store.insert('books', { isbn: cleanIsbn || null, title: String(title).trim(), author: String(author).trim(), publisher: String(publisher || '').trim(), category: String(category || 'General').trim(), published_year: published_year ? Number(published_year) : null, total_copies: copies, available_copies: copies, created_at: dateTime() });
  res.status(201).json({ book });
});
app.put('/api/books/:id', auth, librarianOnly, (req, res) => {
  const id = validId(req.params.id); if (!id) return res.status(400).json({ error: 'Invalid book ID.' });
  const old = store.find('books', id); if (!old) return res.status(404).json({ error: 'Book not found.' });
  const { isbn, title, author, publisher, category, published_year, total_copies } = req.body;
  const copies = Number(total_copies); const borrowed = old.total_copies - old.available_copies; const cleanIsbn = String(isbn || '').trim();
  if (!String(title || '').trim() || !String(author || '').trim()) return res.status(400).json({ error: 'Book title and author are required.' });
  if (!Number.isInteger(copies) || copies < borrowed) return res.status(400).json({ error: `Total copies cannot be less than ${borrowed} currently borrowed copy/copies.` });
  if (duplicateIsbn(cleanIsbn, id)) return res.status(409).json({ error: 'That ISBN already exists.' });
  const book = store.update('books', id, { isbn: cleanIsbn || null, title: String(title).trim(), author: String(author).trim(), publisher: String(publisher || '').trim(), category: String(category || 'General').trim(), published_year: published_year ? Number(published_year) : null, total_copies: copies, available_copies: copies - borrowed });
  res.json({ book });
});
app.delete('/api/books/:id', auth, librarianOnly, (req, res) => {
  const id = validId(req.params.id); if (!id) return res.status(400).json({ error: 'Invalid book ID.' });
  if (!store.find('books', id)) return res.status(404).json({ error: 'Book not found.' });
  if (store.count('borrowings', row => row.book_id === id)) return res.status(409).json({ error: 'This book has borrowing history and cannot be deleted. You can keep it in the catalog instead.' });
  store.remove('books', id); res.json({ message: 'Book deleted.' });
});

app.get('/api/users', auth, librarianOnly, (req, res) => res.json({ users: store.all('users').map(safeUser).sort((a,b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name)) }));
app.post('/api/users', auth, librarianOnly, (req, res) => {
  const { student_id, name, email, password, role } = req.body; const normalizedEmail = String(email || '').trim().toLowerCase(); const studentId = String(student_id || '').trim() || null;
  if (!String(name || '').trim() || !normalizedEmail || !String(password || '')) return res.status(400).json({ error: 'Name, email, and password are required.' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (!['student', 'librarian'].includes(role)) return res.status(400).json({ error: 'Choose a valid role.' });
  if (duplicateEmail(normalizedEmail) || duplicateStudentId(studentId)) return res.status(409).json({ error: 'Email or student ID is already in use.' });
  const user = store.insert('users', { student_id: studentId, name: String(name).trim(), email: normalizedEmail, password_hash: bcrypt.hashSync(password, 10), role, created_at: dateTime() });
  res.status(201).json({ user: safeUser(user) });
});
app.put('/api/users/:id', auth, librarianOnly, (req, res) => {
  const id = validId(req.params.id); if (!id) return res.status(400).json({ error: 'Invalid user ID.' });
  const user = store.find('users', id); if (!user) return res.status(404).json({ error: 'User not found.' });
  const { student_id, name, email, role, password } = req.body; const normalizedEmail = String(email || '').trim().toLowerCase(); const studentId = String(student_id || '').trim() || null;
  if (!String(name || '').trim() || !normalizedEmail) return res.status(400).json({ error: 'Name and email are required.' });
  if (!['student', 'librarian'].includes(role)) return res.status(400).json({ error: 'Choose a valid role.' });
  if (id === req.user.id && role !== 'librarian') return res.status(400).json({ error: 'You cannot change your own role while signed in.' });
  if (password && String(password).length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  if (duplicateEmail(normalizedEmail, id) || duplicateStudentId(studentId, id)) return res.status(409).json({ error: 'Email or student ID is already in use.' });
  const changes = { student_id: studentId, name: String(name).trim(), email: normalizedEmail, role };
  if (password) changes.password_hash = bcrypt.hashSync(password, 10);
  res.json({ user: safeUser(store.update('users', id, changes)) });
});
app.delete('/api/users/:id', auth, librarianOnly, (req, res) => {
  const id = validId(req.params.id); if (!id) return res.status(400).json({ error: 'Invalid user ID.' });
  if (id === req.user.id) return res.status(400).json({ error: 'You cannot delete the account you are currently using.' });
  if (!store.find('users', id)) return res.status(404).json({ error: 'User not found.' });
  if (store.count('borrowings', row => row.user_id === id && row.status === 'borrowed')) return res.status(409).json({ error: 'This user has active borrowed books. Return them before deleting the account.' });
  if (store.count('borrowings', row => row.user_id === id)) return res.status(409).json({ error: 'This user has borrowing history and cannot be deleted.' });
  store.remove('users', id); res.json({ message: 'User deleted.' });
});

app.get('/api/borrowings', auth, (req, res) => {
  const rows = store.all('borrowings').filter(row => req.user.role === 'librarian' || row.user_id === req.user.id).sort((a,b) => b.id - a.id).map(borrowingView).filter(Boolean);
  res.json({ borrowings: rows });
});
app.post('/api/borrowings', auth, (req, res) => {
  const bookId = validId(req.body.book_id); const userId = req.user.role === 'librarian' && req.body.user_id ? validId(req.body.user_id) : req.user.id;
  if (!bookId || !userId) return res.status(400).json({ error: 'Choose a valid book and borrower.' });
  const book = store.find('books', bookId); const borrower = store.find('users', userId);
  if (!book) return res.status(404).json({ error: 'Book not found.' });
  if (!borrower || borrower.role !== 'student') return res.status(400).json({ error: 'Books can only be borrowed by student accounts.' });
  if (book.available_copies < 1) return res.status(409).json({ error: 'No copies of this book are currently available.' });
  if (store.count('borrowings', row => row.user_id === userId && row.book_id === bookId && row.status === 'borrowed')) return res.status(409).json({ error: 'This student already has an active borrowing for this book.' });
  const due = new Date(); due.setDate(due.getDate() + 14);
  const borrowing = store.insert('borrowings', { user_id: userId, book_id: bookId, borrowed_at: dateTime(), due_date: due.toISOString().slice(0,10), returned_at: null, status: 'borrowed', created_at: dateTime() });
  store.update('books', bookId, { available_copies: book.available_copies - 1 });
  res.status(201).json({ borrowing: borrowingView(borrowing) });
});
app.patch('/api/borrowings/:id/return', auth, (req, res) => {
  const id = validId(req.params.id); if (!id) return res.status(400).json({ error: 'Invalid borrowing ID.' });
  const row = store.find('borrowings', id); if (!row) return res.status(404).json({ error: 'Borrowing record not found.' });
  if (req.user.role !== 'librarian' && row.user_id !== req.user.id) return res.status(403).json({ error: 'You can only return books borrowed on your account.' });
  if (row.status === 'returned') return res.status(409).json({ error: 'This book has already been returned.' });
  store.update('borrowings', id, { status: 'returned', returned_at: dateTime() });
  const book = store.find('books', row.book_id); if (book) store.update('books', book.id, { available_copies: book.available_copies + 1 });
  res.json({ message: 'Book returned successfully.' });
});

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'An unexpected server error occurred. Check the backend terminal for details.' }); });
app.listen(PORT, () => console.log(`HEU Digital Library API running at http://localhost:${PORT}`));
