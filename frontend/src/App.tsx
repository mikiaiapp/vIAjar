import { Routes, Route } from 'react-router-dom';
import Home from './Home';
import Register from './Register';
import Login from './Login';
import Profile from './Profile';
import Dashboard from './Dashboard';
import TripGenerator from './TripGenerator';
import Layout from './Layout';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/profile" element={<Layout><Profile /></Layout>} />
      <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
      <Route path="/trip/:tripId/generate" element={<Layout><TripGenerator /></Layout>} />
    </Routes>
  );
}

export default App;
