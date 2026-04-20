import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { MeetingProvider } from './features/meeting/context/MeetingContext';
import Home     from './routes/Home';
import Login    from './routes/Login';
import Register from './routes/Register';
import Prejoin  from './routes/Prejoin';
import Join     from './routes/Join';
import Meeting  from './routes/Meeting';
import About    from './routes/About';
import Security from './routes/Security';
import HostReturn from './routes/HostReturn'; // ← AJOUT

export default function App() {
  return (
    <AuthProvider>
      <MeetingProvider>
        <Routes>
          <Route path="/"                      element={<Home />} />
          <Route path="/login"                 element={<Login />} />
          <Route path="/register"              element={<Register />} />
          <Route path="/join"                  element={<Join />} />
          <Route path="/prejoin/:id"           element={<Prejoin />} />
          <Route path="/meeting/:id"           element={<Meeting />} />
          <Route path="/about"                 element={<About />} />
          <Route path="/security"              element={<Security />} />
          <Route path="/host-return/:roomName" element={<HostReturn />} /> {/* ← AJOUT */}
          <Route path="*"                      element={<Navigate to="/" replace />} />
        </Routes>
      </MeetingProvider>
    </AuthProvider>
  );
}