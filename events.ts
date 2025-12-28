export type ConnectionEvent = Record<string, unknown>;

export type ConnectionErrorEventDetails = {
  error: unknown;
};

export type ConnectionReconnectingEventDetails = {
  delay: number;
};

export type ConnectionEventMap = {
  error: ConnectionErrorEventDetails;
  connect: unknown;
  reconnecting: ConnectionReconnectingEventDetails;
  ready: unknown;
  close: unknown;
  end: unknown;
};

export type ConnectionEventType =
  | "error"
  | "connect"
  | "reconnecting"
  | "ready"
  | "close"
  | "end";
