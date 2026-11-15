/**
 * Rate limit trong bộ nhớ (mỗi instance serverless một bộ đếm).
 * Chặn brute-force cơ bản cho đăng nhập. Muốn chính xác tuyệt đối trên
 * nhiều instance hãy thay bằng Upstash Redis — xem README mục Bảo mật.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit = 5,
  windowMs = 60_000,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

export function clientKey(headers: Headers, scope: string) {
  const forwarded = headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}
