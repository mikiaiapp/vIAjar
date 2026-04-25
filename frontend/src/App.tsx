import { Routes, Route } from 'react-router-dom';
import Register from './Register';
import Login from './Login';
import Profile from './Profile';
import Dashboard from './Dashboard';
import TripGenerator from './TripGenerator';
import TripDetail from './TripDetail';
import Layout from './Layout';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout><Dashboard /></Layout>} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/profile" element={<Layout><Profile /></Layout>} />
      <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
      <Route path="/trip/:tripId/generate" element={<Layout><TripGenerator /></Layout>} />
      <Route path="/trip/:tripId" element={<Layout><TripDetail /></Layout>} />
    </Routes>
  );
}

export default App;
