
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SpeedInsights from './components/SpeedInsights';
import Dashboard from './views/Dashboard';
import Projects from './views/Projects';
import TimeTracking from './views/TimeTracking';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/tracking" element={<TimeTracking />} />
        </Routes>
      </Layout>
      <SpeedInsights />
    </HashRouter>
  );
};

export default App;
