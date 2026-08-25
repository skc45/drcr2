import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { METHODS } from './constants';
import { getUsername, setUsername } from './api';
import { isNativeApp } from './platform';
import {
  HomeView,
  TrashView,
  BoardView,
  CatalogView,
  FeedView,
  MailView,
  ArticleView,
  OverboardView,
  HallOfFameView,
  ThreadView,
} from './views/MethodViews';

function useCompactLayout() {
  const native = isNativeApp();
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : true
  );

  useEffect(() => {
    if (native) return undefined;
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [native]);

  return native || narrow;
}

function pageTitle(pathname) {
  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment) return 'Home';
  if (segment === 'post') return 'Thread';
  return METHODS[segment]?.label || 'DRCR2';
}

function Sidebar({ onNavigate }) {
  const [user, setUser] = useState(getUsername());

  function handleUserChange(e) {
    const v = e.target.value;
    setUser(v);
    setUsername(v);
  }

  return (
    <aside className="sidebar">
      <div className="logo">
        <h1>DRCR2</h1>
        <p>8 posting methods</p>
      </div>
      <nav className="nav-section">
        <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={onNavigate}>
          <span className="nav-icon">⌂</span> Home
        </NavLink>
      </nav>
      <nav className="nav-section">
        <div className="nav-label">Posting Methods</div>
        {Object.entries(METHODS).map(([key, m]) => (
          <NavLink key={key} to={`/${key}`} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={onNavigate}>
            <span className="nav-icon">{m.icon}</span> {m.label}
          </NavLink>
        ))}
      </nav>
      <div className="user-bar">
        <label>Your name</label>
        <input value={user} onChange={handleUserChange} placeholder="Anonymous" />
      </div>
    </aside>
  );
}

export default function App() {
  const compact = useCompactLayout();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle('menu-lock', compact && menuOpen);
    return () => document.body.classList.remove('menu-lock');
  }, [compact, menuOpen]);

  const shellClass = [
    'app-shell',
    compact ? 'compact' : '',
    menuOpen ? 'menu-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={shellClass}>
      {compact && (
        <header className="mobile-header">
          <button
            type="button"
            className="menu-toggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
          <span className="mobile-title">{pageTitle(location.pathname)}</span>
        </header>
      )}
      {compact && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close menu"
          tabIndex={menuOpen ? 0 : -1}
          onClick={() => setMenuOpen(false)}
        />
      )}
      <Sidebar onNavigate={() => setMenuOpen(false)} />
      <main className="main">
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/trash" element={<TrashView />} />
          <Route path="/board" element={<BoardView />} />
          <Route path="/catalog" element={<CatalogView />} />
          <Route path="/feed" element={<FeedView />} />
          <Route path="/mail" element={<MailView />} />
          <Route path="/article" element={<ArticleView />} />
          <Route path="/overboard" element={<OverboardView />} />
          <Route path="/hall_of_fame" element={<HallOfFameView />} />
          <Route path="/post/:id" element={<ThreadView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
