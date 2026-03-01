// engineered by Maro Elias Goth
export type AdminStats = {
  totalUsers: number;
  activeSessions: number;
  totalEvents: number;
  totalChatMessages: number;
  messagesToday: number;
  serverUptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  appVersion: string;
  gitCommit: string;
  dockerContainerId: string | null;
};
