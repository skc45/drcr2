import { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { METHODS } from './constants';
import { getUsername, setUsername } from './api';
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

function Sidebar() {
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
        <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <span className="nav-icon">⌂</span> Home
        </NavLink>
      </nav>
      <nav className="nav-section">
        <div className="nav-label">Posting Methods</div>
        {Object.entries(METHODS).map(([key, m]) => (
          <NavLink key={key} to={`/${key}`} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
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
  return (
    <div className="app-shell">
      <Sidebar />
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
