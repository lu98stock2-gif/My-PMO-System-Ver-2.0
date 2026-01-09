import React from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';

/**
 * SpeedInsights Component
 * 
 * Wraps the Vercel Speed Insights tracking component for seamless integration
 * with the React application. This component enables performance monitoring
 * and metrics tracking on Vercel deployments.
 * 
 * For more information: https://vercel.com/docs/speed-insights
 */
const SpeedInsightsComponent: React.FC = () => {
  return <SpeedInsights />;
};

export default SpeedInsightsComponent;
