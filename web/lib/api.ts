// Thin fetch wrapper around the server.js REST API.

const BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface Status {
  connected: boolean;
  port: string | null;
  stage: number | null;
  error: string | null;
}

export async function getStatus(): Promise<Status> {
  const res = await fetch(`${BASE}/api/status`, { cache: "no-store" });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

export async function setMode(
  stage: number
): Promise<{ ok: true; stage: number }> {
  const res = await fetch(`${BASE}/api/mode`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ stage }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error ?? `status ${res.status}`);
  }
  return body;
}
