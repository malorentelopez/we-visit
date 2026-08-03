const lastCallByBucket = new Map<string, number>();

export async function throttle(
  bucket: string,
  minIntervalMs: number,
): Promise<void> {
  const last = lastCallByBucket.get(bucket) ?? 0;
  const wait = minIntervalMs - (Date.now() - last);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastCallByBucket.set(bucket, Date.now());
}

const hits = new Map<string, { count: number; windowStart: number }>();

export function rateLimitOk(
  key: string,
  maxPerWindow: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const current = hits.get(key);
  if (!current || now - current.windowStart > windowMs) {
    hits.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (current.count >= maxPerWindow) return false;
  current.count += 1;
  return true;
}
