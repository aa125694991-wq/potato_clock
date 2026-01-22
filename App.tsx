import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import PlanningView from './views/PlanningView';
import FocusView from './views/FocusView';
import ReviewView from './views/ReviewView';
import RewardsView from './views/RewardsView';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<PlanningView />} />
          <Route path="focus" element={<FocusView />} />
          <Route path="review" element={<ReviewView />} />
          <Route path="rewards" element={<RewardsView />} />
        </Route>
        
        {/* Catch all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;