export interface TypedEventTarget<TEventMap extends Record<string, unknown>>
  extends
    Omit<
      EventTarget,
      "addEventListener" | "removeEventListener" | "dispatchEvent"
    > {
  addEventListener<K extends keyof TEventMap>(
    type: K,
    callback: (
      event: CustomEvent<TEventMap[K]>,
    ) => void,
    options?: AddEventListenerOptions | boolean,
  ): void;

  removeEventListener<K extends keyof TEventMap>(
    type: K,
    callback: (
      event: CustomEvent<TEventMap[K]>,
    ) => void,
    options?: EventListenerOptions | boolean,
  ): void;
}

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
