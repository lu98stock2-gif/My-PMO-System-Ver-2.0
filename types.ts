
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

// Added EstimateItem interface for the WBS structure
export interface EstimateItem {
  id: string;
  phase: string;
  taskName: string;
  estimatedHours: number;
  role?: string;
  rationale: string;
}

// Added Estimate interface for project estimation records
export interface Estimate {
  id: string;
  projectId?: string;
  inputText: string;
  items: EstimateItem[];
  totalHours: number;
  bufferPercent: number;
  assumptions?: string;
  risks?: string;
  createdAt: string;
}

// Added MonthlyReport interface for generated reports
export interface MonthlyReport {
  id: string;
  month: string;
  summary: string;
  insights: string;
  nextActions: string;
  createdAt: string;
}