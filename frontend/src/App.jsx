import React from 'react';
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen, LayoutDashboard, LibraryBig, Users, ArrowLeftRight, History,
  Search, Plus, Pencil, Trash2, LogOut, Menu, X, RotateCcw, CheckCircle2,
  AlertCircle, LockKeyhole, UserRound, CalendarDays, ChevronRight, RefreshCw
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const blankBook = { isbn: "", title: "", author: "", publisher: "", category: "General", published_year: "", total_copies: 1 };
const blankUser = { student_id: "", name: "", email: "", password: "", role: "student" };

async function request(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function Toast({ toast, clear }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clear, 3800);
    return () => clearTimeout(timer);
  }, [toast, clear]);
  if (!toast) return null;
  return <div className={`toast ${toast.type || "success"}`} role="status">
    {toast.type === "error" ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}
    <span>{toast.message}</span><button className="icon-btn" onClick={clear} aria-label="Close notification"><X size={16}/></button>
  </div>;
}

function Field({ label, children, ...props }) {
  return <label className="field"><span>{label}</span>{children || <input {...props}/>}</label>;
}
function Status({ children, type = "" }) {
  return <span className={`status ${type}`}>{children}</span>;
}
function Empty({ title = "No records found", detail = "Try changing your search or add a new record." }) {
  return <div className="empty"><LibraryBig size={30}/><strong>{title}</strong><span>{detail}</span></div>;
}
function Modal({ title, close, children, onSubmit, submitLabel = "Save changes" }) {
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && close()}>
    <form className="modal" onSubmit={onSubmit}>
      <div className="modal-head"><h2>{title}</h2><button type="button" className="icon-btn" onClick={close} aria-label="Close"><X/></button></div>
      <div className="modal-body">{children}</div>
      <div className="modal-foot"><button type="button" className="btn secondary" onClick={close}>Cancel</button><button className="btn primary" type="submit">{submitLabel}</button></div>
    </form>
  </div>;
}

function Login({ onLogin }) {
  const [email, setEmail] = useState("librarian@library.local");
  const [password, setPassword] = useState("Admin123!");
  const [role, setRole] = useState("librarian");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const data = await request("/auth/login", null, { method: "POST", body: JSON.stringify({ email, password }) });
      if (data.user.role !== role) throw new Error(`This account is a ${data.user.role}. Choose the matching login type.`);
      onLogin(data);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <main className="login-shell">
    <section className="login-art">
      <div className="brand light"><div className="brand-icon"><img src="/heu-logo.png" alt="HEU school seal"/></div><span>HEU <small>DIGITAL LIBRARY</small></span></div>
      <div className="art-copy"><p className="eyebrow">KNOWLEDGE, ORGANIZED</p><h1>Your next chapter<br/>starts here.</h1><p>A simple, secure space to discover books, manage borrowing, and keep every library record in order.</p></div>
      <div className="art-bottom"><span>Digital Library Management System</span><span>React · Node.js · JSON Storage</span></div>
    </section>
    <section className="login-panel">
      <form className="login-form" onSubmit={submit}>
        <div className="mobile-brand"><img src="/heu-logo.png" alt="HEU school seal"/><span>HEU Digital Library</span></div>
        <p className="eyebrow">WELCOME BACK</p><h2>Sign in to your account</h2><p className="muted">Choose your account type to continue.</p>
        <div className="role-switch">
          <button type="button" className={role === "librarian" ? "selected" : ""} onClick={() => {setRole("librarian");setEmail("librarian@library.local");setPassword("Admin123!");setError("");}}><LibraryBig size={17}/> Librarian</button>
          <button type="button" className={role === "student" ? "selected" : ""} onClick={() => {setRole("student");setEmail("student@library.local");setPassword("Student123!");setError("");}}><UserRound size={17}/> Student</button>
        </div>
        <Field label="Email address"><input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@school.edu"/></Field>
        <Field label="Password"><input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password"/></Field>
        {error && <div className="inline-error"><AlertCircle size={17}/>{error}</div>}
        <button className="btn primary login-submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}<ChevronRight size={18}/></button>
        <div className="demo-note"><LockKeyhole size={16}/><div><strong>Demo access</strong><p>Librarian: librarian@library.local · Admin123!</p><p>Student: student@library.local · Student123!</p><small>Change demo passwords before using real personal data.</small></div></div>
      </form>
      <footer className="login-footer">© {new Date().getFullYear()} Digital Library Management System</footer>
    </section>
  </main>;
}

export default function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("library-session") || "null"); } catch { return null; }
  });
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dashboard, setDashboard] = useState(null);
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [borrowings, setBorrowings] = useState([]);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [bookForm, setBookForm] = useState(blankBook);
  const [userForm, setUserForm] = useState(blankUser);
  const [busy, setBusy] = useState(false);
  const librarian = session?.user?.role === "librarian";
  const notify = useCallback((message, type = "success") => setToast({ message, type }), []);
  const clearToast = useCallback(() => setToast(null), []);
  const token = session?.token;

  const logout = useCallback(() => {
    sessionStorage.removeItem("library-session");
    setSession(null); setDashboard(null); setBooks([]); setUsers([]); setBorrowings([]);
    setPage("dashboard");
  }, []);
  const handleLogin = data => {
    sessionStorage.setItem("library-session", JSON.stringify(data));
    setSession(data); setPage("dashboard");
  };

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const [dash, bookData, borrowingData] = await Promise.all([
        request("/dashboard", token), request(`/books?q=${encodeURIComponent(query)}`, token),
        request("/borrowings", token)
      ]);
      setDashboard(dash); setBooks(bookData.books); setBorrowings(borrowingData.borrowings);
      if (session?.user?.role === "librarian") {
        const userData = await request("/users", token);
        setUsers(userData.users);
      }
    } catch (err) {
      notify(err.message, "error");
      if (/session|sign in|token/i.test(err.message)) logout();
    }
  }, [token, query, session?.user?.role, notify, logout, refreshKey]);

  useEffect(() => { loadData(); }, [loadData]);

  const navItems = useMemo(() => [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "catalog", label: "Catalog Items", icon: BookOpen },
    { id: "ebooks", label: "Ebooks", icon: BookOpen },
    { id: "categories", label: "Categories", icon: LibraryBig },
    { id: "authors", label: "Authors", icon: UserRound },
    { id: "publishers", label: "Publishers", icon: LibraryBig },
    ...(librarian ? [{ id: "borrowings", label: "Circulations", icon: ArrowLeftRight }, { id: "returns", label: "Returning Books", icon: RotateCcw }, { id: "users", label: "Members", icon: Users }] : []),
    ...(!librarian ? [{ id: "borrowings", label: "My Circulations", icon: ArrowLeftRight }] : []),
    { id: "history", label: "Circulation History", icon: History }
  ], [librarian]);

  function go(id) { setPage(id); setQuery(""); setSidebarOpen(false); }
  function openNewBook() { setBookForm(blankBook); setModal({ type: "book", mode: "new" }); }
  function openEditBook(book) { setBookForm({ ...book, published_year: book.published_year || "", total_copies: book.total_copies }); setModal({ type: "book", mode: "edit", id: book.id }); }
  function openNewUser() { setUserForm(blankUser); setModal({ type: "user", mode: "new" }); }
  function openEditUser(user) { setUserForm({ student_id: user.student_id || "", name: user.name, email: user.email, password: "", role: user.role }); setModal({ type: "user", mode: "edit", id: user.id }); }

  async function saveBook(e) {
    e.preventDefault(); setBusy(true);
    try {
      const body = { ...bookForm, published_year: bookForm.published_year ? Number(bookForm.published_year) : null, total_copies: Number(bookForm.total_copies) };
      await request(modal.mode === "new" ? "/books" : `/books/${modal.id}`, token, { method: modal.mode === "new" ? "POST" : "PUT", body: JSON.stringify(body) });
      setModal(null); notify(modal.mode === "new" ? "Book added successfully." : "Book details updated."); setRefreshKey(k => k + 1);
    } catch (err) { notify(err.message, "error"); }
    finally { setBusy(false); }
  }
  async function deleteBook(book) {
    if (!window.confirm(`Delete "${book.title}"? This cannot be undone.`)) return;
    try { await request(`/books/${book.id}`, token, { method: "DELETE" }); notify("Book deleted."); setRefreshKey(k => k + 1); }
    catch (err) { notify(err.message, "error"); }
  }
  async function saveUser(e) {
    e.preventDefault(); setBusy(true);
    try {
      const body = { ...userForm };
      if (modal.mode === "edit" && !body.password) delete body.password;
      await request(modal.mode === "new" ? "/users" : `/users/${modal.id}`, token, { method: modal.mode === "new" ? "POST" : "PUT", body: JSON.stringify(body) });
      setModal(null); notify(modal.mode === "new" ? "User created successfully." : "User details updated."); setRefreshKey(k => k + 1);
    } catch (err) { notify(err.message, "error"); }
    finally { setBusy(false); }
  }
  async function deleteUser(user) {
    if (!window.confirm(`Delete account for ${user.name}?`)) return;
    try { await request(`/users/${user.id}`, token, { method: "DELETE" }); notify("User deleted."); setRefreshKey(k => k + 1); }
    catch (err) { notify(err.message, "error"); }
  }
  async function borrowBook(book, userId) {
    try {
      await request("/borrowings", token, { method: "POST", body: JSON.stringify({ book_id: book.id, ...(userId ? { user_id: Number(userId) } : {}) }) });
      notify(`Borrowing recorded: ${book.title}`); setRefreshKey(k => k + 1);
    } catch (err) { notify(err.message, "error"); }
  }
  async function returnBook(item) {
    if (!window.confirm(`Record the return of "${item.book_title}"?`)) return;
    try { await request(`/borrowings/${item.id}/return`, token, { method: "PATCH" }); notify("Book returned successfully."); setRefreshKey(k => k + 1); }
    catch (err) { notify(err.message, "error"); }
  }

  if (!session) return <><Login onLogin={handleLogin}/><Toast toast={toast} clear={clearToast}/></>;

  const activeBorrowings = borrowings.filter(b => b.status === "borrowed");
  const historyItems = borrowings.filter(b => b.status === "returned");
  const displayedBorrowings = page === "history" ? historyItems : page === "returns" ? activeBorrowings : page === "borrowings" ? borrowings : [];
  const titleMap = { dashboard: "Dashboard", catalog: "Catalog Items", ebooks: "Ebooks", categories: "Categories", authors: "Authors", publishers: "Publishers", users: "Members", borrowings: librarian ? "Circulations" : "My Circulations", returns: "Returning Books", history: "Circulation History" };
  const subtitleMap = { dashboard: "Here’s what’s happening in your library today.", catalog: "Discover, search, and manage the library collection.", ebooks: "Browse the library's digital reading collection.", categories: "Explore books grouped by subject and category.", authors: "Browse authors represented in the collection.", publishers: "Review publisher information recorded in the catalog.", users: "Manage library members and their accounts.", borrowings: "Track active loans, due dates, and returns.", returns: "View books that are currently borrowed and record their return.", history: "Review previously returned books." };

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="brand"><div className="brand-icon"><img src="/heu-logo.png" alt="HEU school seal"/></div><span>HEU<small>DIGITAL LIBRARY</small></span><button className="icon-btn mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X/></button></div>
      <div className="workspace"><div className="workspace-avatar"><LibraryBig size={19}/></div><div><strong>HEU Library Workspace</strong><small>Saint Joseph College of Baggao</small></div><span className="online-dot"/></div>
      <div className="nav-label">NAVIGATION</div>
      <nav className="side-nav">{navItems.map(item => {
        const Icon = item.icon;
        return <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => go(item.id)}><Icon size={18}/><span>{item.label}</span>{page === item.id && <span className="nav-marker"/>}</button>;
      })}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><BookOpen size={17}/></div><strong>Library at your fingertips</strong><p>Keep your reading and borrowing organized.</p></div><button className="nav-item logout-item" onClick={logout}><LogOut size={18}/><span>Sign out</span></button></div>
    </aside>
    {sidebarOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}/>}
    <main className="main-area">
      <header className="topbar">
        <div className="top-left"><button className="icon-btn menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu/></button><div className="breadcrumb">Library <ChevronRight size={14}/><strong>{titleMap[page]}</strong></div></div>
        <div className="top-actions"><button className="icon-btn" title="Refresh data" onClick={() => setRefreshKey(k => k + 1)}><RefreshCw size={17}/></button><div className="top-divider"/><div className="user-chip"><div className="user-avatar">{session.user.name.split(" ").map(x => x[0]).slice(0,2).join("").toUpperCase()}</div><div><strong>{session.user.name}</strong><small>{librarian ? "Librarian" : "Student"}</small></div></div></div>
      </header>
      <div className="page-content">
        <div className="page-heading"><div><p className="eyebrow">LIBRARY OVERVIEW</p><h1>{titleMap[page]}</h1><p className="muted">{subtitleMap[page]}</p></div>
          {(page === "catalog" || page === "ebooks") && librarian && <button className="btn primary" onClick={openNewBook}><Plus size={17}/> Add book</button>}
          {page === "users" && librarian && <button className="btn primary" onClick={openNewUser}><Plus size={17}/> Add user</button>}
        </div>

        {page === "dashboard" && <section className="page-section">
          <div className="welcome-banner"><div><p className="eyebrow">YOUR LIBRARY, AT A GLANCE</p><h2>{librarian ? "Welcome to your library workspace." : `Welcome back, ${session.user.name.split(" ")[0]}.`}</h2><p>{librarian ? "Manage your collection and keep every borrowing on track." : "Explore the catalog and find your next great read."}</p><button className="btn light-btn" onClick={() => go("catalog")}>Explore book catalog <ChevronRight size={17}/></button></div><div className="banner-illustration"><BookOpen size={94} strokeWidth={1}/><span className="orbit orbit-one"/><span className="orbit orbit-two"/></div></div>
          <div className="section-title"><div><h2>Library statistics</h2><p className="muted">A quick overview of current activity</p></div><span className="live-label"><span/> LIVE DATA</span></div>
          <div className="stat-grid">
            <StatCard icon={BookOpen} label="Book titles" value={dashboard?.books ?? "—"} hint={`${dashboard?.copies ?? 0} total copies`} />
            <StatCard icon={CheckCircle2} label="Available copies" value={dashboard?.available ?? "—"} hint="Ready to borrow" />
            <StatCard icon={ArrowLeftRight} label="Active borrowings" value={dashboard?.active ?? "—"} hint="Books not yet returned" />
            <StatCard icon={CalendarDays} label="Overdue books" value={dashboard?.overdue ?? "—"} hint="Past their due date" alert={dashboard?.overdue > 0}/>
            {librarian && <StatCard icon={Users} label="Student accounts" value={dashboard?.users ?? "—"} hint="Registered students"/>}
          </div>
          <div className="content-card"><div className="card-heading"><div><h2>Recent borrowing activity</h2><p className="muted">Latest library transactions</p></div><button className="text-btn" onClick={() => go("borrowings")}>View all <ChevronRight size={15}/></button></div>
            <BorrowingTable items={borrowings.slice(0,5)} librarian={librarian} onReturn={returnBook} compact/>
          </div>
        </section>}

        {page === "ebooks" && <div className="content-card"><div className="card-heading"><div><h2>Digital collection</h2><p className="muted">Use this area to organize ebook catalog entries. The current project does not yet upload or stream ebook files.</p></div></div></div>}
        {(page === "catalog" || page === "ebooks") && <section className="page-section"><div className="content-card">
          <div className="toolbar"><div className="search-box"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by title, author, ISBN, category…"/></div><span className="result-count">{books.length} {books.length === 1 ? "book" : "books"}</span></div>
          {books.length ? <div className="table-wrap"><table><thead><tr><th>BOOK DETAILS</th><th>ISBN</th><th>CATEGORY</th><th>AVAILABILITY</th><th className="align-right">ACTIONS</th></tr></thead><tbody>{books.map(book => <tr key={book.id}><td><div className="book-cell"><div className="book-cover"><BookOpen size={20}/></div><div><strong>{book.title}</strong><small>by {book.author}{book.publisher ? ` · ${book.publisher}` : ""}{book.published_year ? ` · ${book.published_year}` : ""}</small></div></div></td><td className="mono">{book.isbn || "—"}</td><td><span className="category-tag">{book.category}</span></td><td><div className="availability"><strong>{book.available_copies}</strong><span>/ {book.total_copies} copies</span><Status type={book.available_copies > 0 ? "available" : "unavailable"}>{book.available_copies > 0 ? "Available" : "Unavailable"}</Status></div></td><td><div className="row-actions">{book.available_copies > 0 && (librarian ? <button className="btn small-btn secondary" onClick={() => { const studentId = window.prompt("Enter the student account ID (shown in User management)."); if (studentId) borrowBook(book, studentId); }}>Issue</button> : <button className="btn small-btn secondary" onClick={() => borrowBook(book)}>Borrow</button>)}{librarian && <><button className="icon-btn" title="Edit book" onClick={() => openEditBook(book)}><Pencil size={16}/></button><button className="icon-btn danger-hover" title="Delete book" onClick={() => deleteBook(book)}><Trash2 size={16}/></button></>}</div></td></tr>)}</tbody></table></div> : <Empty title="No books match your search" detail="Try another keyword or add a book to the collection."/>}
        </div></section>}

        {page === "categories" && <section className="page-section"><div className="content-card"><div className="toolbar"><div className="search-box"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search categories…"/></div><span className="result-count">{[...new Set(books.map(b => b.category || "General"))].filter(x => x.toLowerCase().includes(query.toLowerCase())).length} categories</span></div>{[...new Set(books.map(b => b.category || "General"))].filter(x => x.toLowerCase().includes(query.toLowerCase())).length ? <div className="table-wrap"><table><thead><tr><th>CATEGORY</th><th>BOOK TITLES</th><th>TOTAL COPIES</th><th>AVAILABLE COPIES</th></tr></thead><tbody>{[...new Set(books.map(b => b.category || "General"))].filter(x => x.toLowerCase().includes(query.toLowerCase())).sort().map(category => { const rows=books.filter(b=>(b.category||"General")===category); return <tr key={category}><td><span className="category-tag">{category}</span></td><td>{rows.length}</td><td>{rows.reduce((n,b)=>n+b.total_copies,0)}</td><td>{rows.reduce((n,b)=>n+b.available_copies,0)}</td></tr>; })}</tbody></table></div> : <Empty title="No categories found"/>}</div></section>}

        {page === "authors" && <section className="page-section"><div className="content-card"><div className="toolbar"><div className="search-box"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search authors…"/></div><span className="result-count">{[...new Set(books.map(b => b.author).filter(Boolean))].filter(x => x.toLowerCase().includes(query.toLowerCase())).length} authors</span></div>{[...new Set(books.map(b => b.author).filter(Boolean))].filter(x => x.toLowerCase().includes(query.toLowerCase())).length ? <div className="table-wrap"><table><thead><tr><th>AUTHOR</th><th>BOOK TITLES</th><th>CATEGORIES</th></tr></thead><tbody>{[...new Set(books.map(b => b.author).filter(Boolean))].filter(x => x.toLowerCase().includes(query.toLowerCase())).sort().map(author => { const rows=books.filter(b=>b.author===author); return <tr key={author}><td><strong>{author}</strong></td><td>{rows.length}</td><td>{[...new Set(rows.map(b=>b.category))].join(", ")}</td></tr>; })}</tbody></table></div> : <Empty title="No authors found" detail="Authors appear here when books are added to the catalog."/>}</div></section>}

        {page === "publishers" && (
          <section className="page-section">
            <div className="content-card">
              <div className="toolbar">
                <div className="search-box">
                  <Search size={18} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search publishers..."
                  />
                </div>
                <span className="result-count">
                  {Array.from(new Set(books.map((book) => book.publisher).filter(Boolean)))
                    .filter((publisher) => publisher.toLowerCase().includes(query.toLowerCase())).length} publishers
                </span>
              </div>
              {Array.from(new Set(books.map((book) => book.publisher).filter(Boolean)))
                .filter((publisher) => publisher.toLowerCase().includes(query.toLowerCase())).length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>PUBLISHER</th><th>BOOK TITLES</th><th>CATEGORIES</th></tr>
                    </thead>
                    <tbody>
                      {Array.from(new Set(books.map((book) => book.publisher).filter(Boolean)))
                        .filter((publisher) => publisher.toLowerCase().includes(query.toLowerCase()))
                        .sort()
                        .map((publisher) => {
                          const publisherBooks = books.filter((book) => book.publisher === publisher);
                          return (
                            <tr key={publisher}>
                              <td><strong>{publisher}</strong></td>
                              <td>{publisherBooks.length}</td>
                              <td>{Array.from(new Set(publisherBooks.map((book) => book.category))).join(", ")}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty title="No publishers recorded" detail="Add publisher details when creating or editing catalog items." />
              )}
            </div>
          </section>
        )}

        {page === "users" && librarian && <section className="page-section"><div className="content-card"><div className="toolbar"><div className="search-box"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search users by name, email, or student ID…"/></div><span className="result-count">{users.filter(u => `${u.name} ${u.email} ${u.student_id || ""}`.toLowerCase().includes(query.toLowerCase())).length} users</span></div>
          {users.filter(u => `${u.name} ${u.email} ${u.student_id || ""}`.toLowerCase().includes(query.toLowerCase())).length ? <div className="table-wrap"><table><thead><tr><th>USER</th><th>STUDENT ID</th><th>ROLE</th><th>DATE ADDED</th><th className="align-right">ACTIONS</th></tr></thead><tbody>{users.filter(u => `${u.name} ${u.email} ${u.student_id || ""}`.toLowerCase().includes(query.toLowerCase())).map(user => <tr key={user.id}><td><div className="book-cell"><div className="user-avatar table-avatar">{user.name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</div><div><strong>{user.name}</strong><small>{user.email}</small></div></div></td><td className="mono">{user.student_id || "—"}</td><td><Status type={user.role === "librarian" ? "role-admin" : "role-student"}>{user.role}</Status></td><td>{user.created_at?.slice(0,10) || "—"}</td><td><div className="row-actions"><button className="icon-btn" title="Edit user" onClick={() => openEditUser(user)}><Pencil size={16}/></button><button className="icon-btn danger-hover" title="Delete user" onClick={() => deleteUser(user)} disabled={user.id === session.user.id}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div> : <Empty title="No users found" detail="Add a student or librarian account to get started."/>}
        </div></section>}

        {(page === "borrowings" || page === "returns" || page === "history") && <section className="page-section">
          {page === "returns" && <div className="stat-grid return-summary">
            <StatCard icon={ArrowLeftRight} label="Books to return" value={activeBorrowings.length} hint="Currently borrowed" />
            <StatCard icon={CalendarDays} label="Overdue returns" value={activeBorrowings.filter(item => item.is_overdue).length} hint="Past the due date" alert={activeBorrowings.some(item => item.is_overdue)} />
            <StatCard icon={CheckCircle2} label="Returned books" value={historyItems.length} hint="Completed returns" />
          </div>}
          <div className="content-card"><div className="toolbar"><div><h2>{page === "history" ? "Returned books history" : page === "returns" ? "Books to be returned" : "All borrowing transactions"}</h2><p className="muted">{page === "history" ? "Completed borrowing records and return dates." : page === "returns" ? "Find a student’s active loan and record the book when it is returned." : "Current loans and completed returns."}</p></div><span className="result-count">{displayedBorrowings.length} records</span></div><BorrowingTable items={displayedBorrowings} librarian={librarian} onReturn={returnBook}/></div>
        </section>}
      </div>
      <footer className="app-footer"><span>HEU Digital Library</span><span>Built with React, Node.js & JSON file storage</span></footer>
    </main>
    {modal?.type === "book" && <Modal title={modal.mode === "new" ? "Add a new book" : "Edit book details"} close={() => setModal(null)} onSubmit={saveBook} submitLabel={busy ? "Saving…" : "Save book"}>
      <div className="form-grid"><Field label="Book title"><input required value={bookForm.title} onChange={e=>setBookForm({...bookForm,title:e.target.value})} placeholder="Enter book title"/></Field><Field label="Author"><input required value={bookForm.author} onChange={e=>setBookForm({...bookForm,author:e.target.value})} placeholder="Author name"/></Field><Field label="Publisher (optional)"><input value={bookForm.publisher || ""} onChange={e=>setBookForm({...bookForm,publisher:e.target.value})} placeholder="Publisher name"/></Field><Field label="ISBN (optional)"><input value={bookForm.isbn || ""} onChange={e=>setBookForm({...bookForm,isbn:e.target.value})} placeholder="ISBN number"/></Field><Field label="Category"><select value={bookForm.category} onChange={e=>setBookForm({...bookForm,category:e.target.value})}><option>General</option><option>Fiction</option><option>Non-fiction</option><option>Technology</option><option>Science</option><option>History</option><option>Education</option><option>Reference</option><option>Biography</option></select></Field><Field label="Publication year"><input type="number" min="0" max="2100" value={bookForm.published_year || ""} onChange={e=>setBookForm({...bookForm,published_year:e.target.value})} placeholder="e.g. 2024"/></Field><Field label="Total copies"><input required type="number" min={modal.mode === "edit" ? Math.max(0, (books.find(b=>b.id===modal.id)?.total_copies || 0) - (books.find(b=>b.id===modal.id)?.available_copies || 0)) : 0} step="1" value={bookForm.total_copies} onChange={e=>setBookForm({...bookForm,total_copies:e.target.value})}/></Field></div>
    </Modal>}
    {modal?.type === "user" && <Modal title={modal.mode === "new" ? "Create user account" : "Edit user account"} close={() => setModal(null)} onSubmit={saveUser} submitLabel={busy ? "Saving…" : "Save account"}>
      <div className="form-grid"><Field label="Full name"><input required value={userForm.name} onChange={e=>setUserForm({...userForm,name:e.target.value})} placeholder="Full name"/></Field><Field label="Student ID (optional)"><input value={userForm.student_id} onChange={e=>setUserForm({...userForm,student_id:e.target.value})} placeholder="e.g. 2026-001"/></Field><Field label="Email address"><input required type="email" value={userForm.email} onChange={e=>setUserForm({...userForm,email:e.target.value})} placeholder="name@school.edu"/></Field><Field label={modal.mode === "new" ? "Password (min. 8 characters)" : "New password (optional)"}><input type="password" minLength={8} required={modal.mode === "new"} autoComplete="new-password" value={userForm.password} onChange={e=>setUserForm({...userForm,password:e.target.value})} placeholder={modal.mode === "new" ? "Create a password" : "Leave blank to keep current password"}/></Field><Field label="Role"><select value={userForm.role} onChange={e=>setUserForm({...userForm,role:e.target.value})}><option value="student">Student</option><option value="librarian">Librarian</option></select></Field></div>
    </Modal>}
    <Toast toast={toast} clear={clearToast}/>
  </div>;
}

function StatCard({ icon: Icon, label, value, hint, alert }) {
  return <div className={`stat-card ${alert ? "stat-alert" : ""}`}><div className="stat-top"><span className="stat-icon"><Icon size={19}/></span>{alert && <Status type="overdue">Needs attention</Status>}</div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-hint">{hint}</span></div>;
}

function BorrowingTable({ items, librarian, onReturn, compact = false }) {
  if (!items.length) return <Empty title="No borrowing records yet" detail="Borrowing activity will appear here when a book is checked out."/>;
  return <div className="table-wrap"><table><thead><tr><th>BOOK</th>{librarian && <th>STUDENT</th>}<th>DATE BORROWED</th><th>DUE DATE</th><th>STATUS</th>{!compact && <th className="align-right">ACTION</th>}</tr></thead><tbody>{items.map(item => <tr key={item.id}><td><div className="book-cell"><div className="book-cover small-cover"><BookOpen size={17}/></div><div><strong>{item.book_title}</strong><small>{item.book_author}</small></div></div></td>{librarian && <td><div><strong>{item.borrower_name}</strong><small>{item.student_id || item.borrower_email}</small></div></td>}<td>{item.borrowed_at?.slice(0,10) || "—"}</td><td>{item.due_date || "—"}</td><td>{item.status === "returned" ? <Status type="returned">Returned</Status> : item.is_overdue ? <Status type="overdue">Overdue</Status> : <Status type="borrowed">Borrowed</Status>}</td>{!compact && <td><div className="row-actions">{item.status === "borrowed" ? <button className="btn small-btn secondary" onClick={() => onReturn(item)}><RotateCcw size={14}/> Return</button> : <span className="return-date">{item.returned_at?.slice(0,10) || "Complete"}</span>}</div></td>}</tr>)}</tbody></table></div>;
}
