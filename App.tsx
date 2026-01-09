
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.tsx';
import Dashboard from './views/Dashboard.tsx';
import Projects from './views/Projects.tsx';
import TimeTracking from './views/TimeTracking.tsx';

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
    </HashRouter>
  );
};

export default App;
