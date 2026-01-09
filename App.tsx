
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.tsx';
import Dashboard from './views/Dashboard.tsx';
import Projects from './views/Projects.tsx';
import TimeTracking from './views/TimeTracking.tsx';
import Estimator from './views/Estimator.tsx';
import Reports from './views/Reports.tsx';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/estimator" element={<Estimator />} />
          <Route path="/tracking" element={<TimeTracking />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
