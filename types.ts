
export interface User {
  id: string;
  email: string;
  name: string;
}

export type ProjectStatus = 'On-going' | 'Done' | 'Back Log';

export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status: ProjectStatus;
  estimatedHours?: number; // Added project-level estimated hours
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  projectId: string;
  taskName: string;
  taskType: string;
  deliverable?: string;
  date: string; // YYYY-MM-DD
  hours: number;
  memo?: string;
  createdAt: string;
}

// Added EstimateItem to define individual tasks in a WBS
export interface EstimateItem {
  id: string;
  phase: string;
  taskName: string;
  estimatedHours: number;
  role?: string;
  rationale: string;
}

// Added Estimate to track the full project estimation
export interface Estimate {
  id: string;
  projectId?: string;
  inputText: string;
  assumptions?: string;
  risks?: string;
  totalHours: number;
  bufferPercent: number;
  items: EstimateItem[];
  createdAt: string;
}

// Added MonthlyReport for storing generated insights
export interface MonthlyReport {
  id: string;
  month: string;
  summary: string;
  insights: string;
  nextActions: string;
  createdAt: string;
}
