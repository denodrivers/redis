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

export function createTypedEventTarget<
  TEventMap extends Record<string, unknown>,
>(): TypedEventTarget<TEventMap> {
  return new EventTarget() as TypedEventTarget<TEventMap>;
}

export function dispatchEvent<
  TEventMap extends Record<string, unknown>,
  TKey extends Extract<keyof TEventMap, string>,
>(
  eventTarget: TypedEventTarget<TEventMap>,
  event: TKey,
  detail: TEventMap[TKey],
): boolean {
  return (eventTarget as EventTarget).dispatchEvent(
    new CustomEvent(event, {
      detail,
    }),
  );
}
