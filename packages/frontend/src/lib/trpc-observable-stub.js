// This is a stub file to satisfy tRPC client imports
// It provides minimal implementations of functions from @trpc/server/observable

export function observable(subscribe) {
  return {
    subscribe: (observer) => {
      const unsubscribe = subscribe({
        next: observer.next ? observer.next.bind(observer) : () => {},
        error: observer.error ? observer.error.bind(observer) : () => {},
        complete: observer.complete ? observer.complete.bind(observer) : () => {}
      });
      return { unsubscribe };
    }
  };
}

export function share(observable) {
  let subscriptions = 0;
  let subscription = null;
  let lastValue = null;
  let hasValue = false;
  
  return {
    subscribe: (observer) => {
      subscriptions++;
      if (hasValue) {
        observer.next(lastValue);
      }
      if (!subscription) {
        subscription = observable.subscribe({
          next: (value) => {
            lastValue = value;
            hasValue = true;
            observer.next(value);
          },
          error: (err) => observer.error(err),
          complete: () => observer.complete()
        });
      }
      
      return {
        unsubscribe: () => {
          subscriptions--;
          if (subscriptions === 0 && subscription) {
            subscription.unsubscribe();
            subscription = null;
          }
        }
      };
    }
  };
}

export function observableToPromise(observable) {
  return new Promise((resolve, reject) => {
    const subscription = observable.subscribe({
      next: (value) => {
        subscription.unsubscribe();
        resolve(value);
      },
      error: (error) => {
        subscription.unsubscribe();
        reject(error);
      },
      complete: () => {
        subscription.unsubscribe();
        resolve(undefined);
      },
    });
  });
}

export function tap(tapFn) {
  return (source) => {
    return observable((observer) => {
      return source.subscribe({
        next: (value) => {
          tapFn(value);
          observer.next(value);
        },
        error: (err) => observer.error(err),
        complete: () => observer.complete(),
      });
    });
  };
}

export default {
  observable,
  share,
  observableToPromise,
  tap
};
