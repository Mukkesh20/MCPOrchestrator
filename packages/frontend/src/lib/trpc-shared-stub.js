// This is a stub file to satisfy tRPC client imports
// It provides minimal implementations of functions from @trpc/server/shared

export function createFlatProxy(handler) {
  return new Proxy(() => {}, {
    get(_, prop) {
      return handler(prop);
    },
    apply(_, __, args) {
      return handler(...args);
    }
  });
}

export function createRecursiveProxy(handler) {
  const proxy = new Proxy(() => {}, {
    get(_, prop) {
      if (prop === 'then') {
        return undefined;
      }
      return createRecursiveProxy((opts) => handler({ ...opts, path: [...(opts?.path || []), prop] }));
    },
    apply(_, __, args) {
      return handler({ args });
    }
  });
  return proxy;
}

export function getCauseFromUnknown(cause) {
  return { message: String(cause) };
}

export default {
  createFlatProxy,
  createRecursiveProxy,
  getCauseFromUnknown
};
