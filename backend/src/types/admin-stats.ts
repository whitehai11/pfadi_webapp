// engineered by Maro Elias Goth
export type AdminStats = {
  totalUsers: number;
  activeSessions: number;
  totalEvents: number;
  matrixUsers: number;
  serverUptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  appVersion: string;
  gitCommit: string;
  dockerContainerId: string | null;
};
