import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import CommunitySelector from './pages/CommunitySelector';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Booking from './pages/Booking';
import Admin from './pages/Admin';
import AdminCommunity from './pages/AdminCommunity';

import AdminCourt from './pages/AdminCourt';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('padeltino_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogout = () => {
    localStorage.removeItem('padeltino_user');
    setUser(null);
  };

  return (
    <Router>
      <div className="app-wrapper">
        {user && <Navbar isAdmin={user.isAdmin} onLogout={handleLogout} user={user} />}

        <Routes>
          {/* Landing / Selector */}
          <Route path="/" element={!user ? <CommunitySelector /> : <Navigate to="/dashboard" />} />
          
          {/* Login with specific community */}
          <Route path="/login/:communityId" element={!user ? <Login onLogin={setUser} /> : <Navigate to="/dashboard" />} />
          
          <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/" />} />
          <Route path="/book" element={user ? <Booking user={user} /> : <Navigate to="/" />} />
          
          <Route path="/admin" element={user?.isAdmin ? <Admin /> : <Navigate to={user ? '/dashboard' : '/'} />} />
          <Route path="/admin/community/:id" element={user?.isAdmin ? <AdminCommunity /> : <Navigate to={user ? '/dashboard' : '/'} />} />
          <Route path="/admin/community/:commId/court/:courtId" element={user?.isAdmin ? <AdminCourt /> : <Navigate to={user ? '/dashboard' : '/'} />} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
