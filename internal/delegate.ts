type Delegate<TObject, TMethods extends keyof TObject> =
  Pick<TObject, TMethods> extends Record<
    string | symbol,
    // deno-lint-ignore ban-types -- This is used only as a constraint on the type argument
    Function
  > ? Pick<TObject, TMethods>
    : never;

export function delegate<
  TObject extends object,
  TMethods extends keyof TObject,
>(
  target: TObject,
  methods: Array<TMethods>,
): Delegate<TObject, TMethods> {
  return methods.reduce((proxy, method) => {
    if (typeof target[method] === "function") {
      proxy[method] = target[method].bind(target);
    } else {
      throw new Error(`${String(method)} should be a method`);
    }
    return proxy;
  }, {} as Delegate<TObject, TMethods>);
}
