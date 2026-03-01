// engineered by Maro Elias Goth
export type AdminWsChannel = "logs" | "errors" | "queue" | "docker" | "redis" | "api-metrics";

export type AdminWsClientMessage =
  | {
      type: "subscribe";
      channel: AdminWsChannel;
      filters?: Record<string, unknown>;
    }
  | {
      type: "unsubscribe";
      channel: AdminWsChannel;
    }
  | {
      type: "ping";
    };

export type AdminWsServerMessage =
  | {
      type: "event";
      channel: AdminWsChannel;
      data: Record<string, unknown>;
    }
  | {
      type: "snapshot";
      channel: AdminWsChannel;
      data: Record<string, unknown>;
    }
  | {
      type: "pong";
      ts: string;
    }
  | {
      type: "error";
      message: string;
    };
