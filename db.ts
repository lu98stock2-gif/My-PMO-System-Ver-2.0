
import { Project, Estimate, TimeEntry, MonthlyReport } from './types.ts';

const STORAGE_KEYS = {
  PROJECTS: 'pm_projects',
  ESTIMATES: 'pm_estimates',
  TIME_ENTRIES: 'pm_time_entries',
  REPORTS: 'pm_reports',
};

const get = <T,>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const save = <T,>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const DB = {
  // Projects
  getProjects: (): Project[] => get<Project>(STORAGE_KEYS.PROJECTS),
  saveProject: (project: Project) => {
    const list = DB.getProjects();
    save(STORAGE_KEYS.PROJECTS, [...list, project]);
  },
  updateProject: (updated: Project) => {
    const list = DB.getProjects().map(p => p.id === updated.id ? updated : p);
    save(STORAGE_KEYS.PROJECTS, list);
  },
  deleteProject: (id: string) => {
    const list = DB.getProjects().filter(p => p.id !== id);
    save(STORAGE_KEYS.PROJECTS, list);
    const entries = DB.getTimeEntries().filter(e => e.projectId !== id);
    save(STORAGE_KEYS.TIME_ENTRIES, entries);
    const estimates = DB.getEstimates().filter(e => e.projectId !== id);
    save(STORAGE_KEYS.ESTIMATES, estimates);
  },

  // Estimates
  getEstimates: (): Estimate[] => get<Estimate>(STORAGE_KEYS.ESTIMATES),
  saveEstimate: (estimate: Estimate) => {
    const list = DB.getEstimates();
    save(STORAGE_KEYS.ESTIMATES, [...list, estimate]);
  },
  updateEstimate: (updated: Estimate) => {
    const list = DB.getEstimates().map(e => e.id === updated.id ? updated : e);
    save(STORAGE_KEYS.ESTIMATES, list);
  },
  deleteEstimate: (id: string) => {
    const list = DB.getEstimates().filter(e => e.id !== id);
    save(STORAGE_KEYS.ESTIMATES, list);
  },

  // Time Entries
  getTimeEntries: (): TimeEntry[] => get<TimeEntry>(STORAGE_KEYS.TIME_ENTRIES),
  saveTimeEntry: (entry: TimeEntry) => {
    const list = DB.getTimeEntries();
    save(STORAGE_KEYS.TIME_ENTRIES, [...list, entry]);
  },
  updateTimeEntry: (updated: TimeEntry) => {
    const list = DB.getTimeEntries().map(e => e.id === updated.id ? updated : e);
    save(STORAGE_KEYS.TIME_ENTRIES, list);
  },
  deleteTimeEntry: (id: string) => {
    const list = DB.getTimeEntries().filter(e => e.id !== id);
    save(STORAGE_KEYS.TIME_ENTRIES, list);
  },

  // Reports
  getReports: (): MonthlyReport[] => get<MonthlyReport>(STORAGE_KEYS.REPORTS),
  saveReport: (report: MonthlyReport) => {
    const list = DB.getReports();
    save(STORAGE_KEYS.REPORTS, [...list, report]);
  },
  deleteReport: (id: string) => {
    const list = DB.getReports().filter(r => r.id !== id);
    save(STORAGE_KEYS.REPORTS, list);
  },

  // Backup & Restore
  exportData: () => {
    const data = {
      projects: DB.getProjects(),
      estimates: DB.getEstimates(),
      timeEntries: DB.getTimeEntries(),
      reports: DB.getReports(),
      // Also include daily memos stored separately in localStorage
      memos: Object.keys(localStorage)
        .filter(key => key.startsWith('daily_memo_'))
        .reduce((acc, key) => {
          acc[key] = localStorage.getItem(key);
          return acc;
        }, {} as Record<string, string | null>)
    };
    return JSON.stringify(data, null, 2);
  },

  importData: (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.projects) save(STORAGE_KEYS.PROJECTS, data.projects);
      if (data.estimates) save(STORAGE_KEYS.ESTIMATES, data.estimates);
      if (data.timeEntries) save(STORAGE_KEYS.TIME_ENTRIES, data.timeEntries);
      if (data.reports) save(STORAGE_KEYS.REPORTS, data.reports);
      if (data.memos) {
        Object.entries(data.memos).forEach(([key, value]) => {
          if (value !== null) localStorage.setItem(key, value as string);
        });
      }
      return true;
    } catch (e) {
      console.error("Failed to import data:", e);
      return false;
    }
  }
};
