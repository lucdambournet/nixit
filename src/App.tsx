import { Route, Routes, Navigate } from 'react-router-dom';
import Signup from './pages/Signup';
import Login from './pages/Login';
import ServiceLogin from './pages/ServiceLogin';
import Enrollment from './pages/Enrollment';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Navigate to="/signup" replace />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/service-login" element={<ServiceLogin />} />
        <Route path="/enrollment" element={<Enrollment />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </div>
  );
}

export default App;
