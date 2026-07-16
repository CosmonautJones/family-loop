export type ClientErrorOperation = 'auth' | 'data' | 'media' | 'render';
export type ClientErrorCategory = 'network' | 'session' | 'access' | 'conflict' | 'rate-limit' | 'unknown' | 'render';

export type ClientErrorTelemetryEvent = {
  operation: ClientErrorOperation;
  category: ClientErrorCategory;
  release: string;
};

type SendClientErrorTelemetry = (event: ClientErrorTelemetryEvent) => PromiseLike<unknown>;

const environments = new Set(['loopedin-staging', 'loopedin-production']);
const operations = new Set<ClientErrorOperation>(['auth', 'data', 'media', 'render']);
const categories = new Set<ClientErrorCategory>(['network', 'session', 'access', 'conflict', 'rate-limit', 'unknown', 'render']);
const maxReportsPerPage = 5;
const releasePattern = /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}-[0-9a-f]{12}$/;

export function createClientErrorTelemetryReporter(environment: string, release: string, send: SendClientErrorTelemetry) {
  const fingerprints = new Set<string>();
  let reportCount = 0;

  return (event: Omit<ClientErrorTelemetryEvent, 'release'>) => {
    if (!environments.has(environment)
      || !releasePattern.test(release)
      || !operations.has(event.operation)
      || !categories.has(event.category)
      || ((event.operation === 'render') !== (event.category === 'render'))
      || reportCount >= maxReportsPerPage) return;

    const fingerprint = `${event.operation}:${event.category}`;
    if (fingerprints.has(fingerprint)) return;
    fingerprints.add(fingerprint);
    reportCount += 1;

    const boundedEvent: ClientErrorTelemetryEvent = {
      operation: event.operation,
      category: event.category,
      release,
    };
    void Promise.resolve().then(() => send(boundedEvent)).catch(() => undefined);
  };
}
