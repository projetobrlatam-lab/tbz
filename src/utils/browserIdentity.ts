export type BrowserGeo = { lat: number, lon: number, accuracy?: number };
export type BrowserIdentity = { ipv4: string | null, userAgent: string, acceptLanguage: string, geo: BrowserGeo | null };

const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';
const ENABLE_BROWSER_GEO = false;

async function fetchWithTimeout(url: string, timeoutMs = 1500): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
  } finally {
    clearTimeout(id);
  }
}

function extractIPv4(str?: string | null): string | null {
  if (!str) return null;
  const m = str.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  return m ? m[0] : null;
}

export async function getIPv4(): Promise<string | null> {
  if (!isBrowser) return null;
  const candidates: Promise<string | null>[] = [
    (async () => { try { const r = await fetchWithTimeout('https://api.ipify.org?format=json'); if (r.ok) { const j = await r.json(); return extractIPv4(j?.ip); } } catch { } return null; })(),
    (async () => { try { const r = await fetchWithTimeout('https://ipapi.co/json/'); if (r.ok) { const j = await r.json(); return extractIPv4(j?.ip); } } catch { } return null; })(),
    (async () => { try { const r = await fetchWithTimeout('https://ipwho.is/'); if (r.ok) { const j = await r.json(); return extractIPv4(j?.ip); } } catch { } return null; })(),
    (async () => { try { const r = await fetchWithTimeout('https://ipinfo.io/json'); if (r.ok) { const j = await r.json(); return extractIPv4(j?.ip); } } catch { } return null; })(),
  ];
  const results = await Promise.allSettled(candidates);
  for (const res of results) {
    if (res.status === 'fulfilled' && res.value) return res.value;
  }
  return null;
}

export async function getBrowserGeo(timeoutMs = 1500): Promise<BrowserGeo | null> {
  if (!ENABLE_BROWSER_GEO || !isBrowser || !('geolocation' in navigator)) return null;
  return await new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => { if (!settled) { settled = true; resolve(null); } }, timeoutMs);
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          const { latitude, longitude, accuracy } = pos.coords;
          resolve({ lat: latitude, lon: longitude, accuracy });
        },
        () => { if (!settled) { settled = true; clearTimeout(timer); resolve(null); } },
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 }
      );
    } catch {
      if (!settled) { settled = true; clearTimeout(timer); resolve(null); }
    }
  });
}

export function getUserAgent(): string {
  if (!isBrowser) return '';
  return navigator.userAgent || '';
}

export function getAcceptLanguage(): string {
  if (!isBrowser) return '';
  const langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language];
  return Array.isArray(langs) ? langs.join(',') : (navigator.language || '');
}

export async function collectBrowserIdentity(): Promise<BrowserIdentity> {
  const [ipv4, geo] = await Promise.all([getIPv4(), getBrowserGeo()]);
  return {
    ipv4: ipv4,
    userAgent: getUserAgent(),
    acceptLanguage: getAcceptLanguage(),
    geo: geo || null,
  };
}

export async function computeFingerprint(parts: (string | null | undefined)[]): Promise<string> {
  const text = parts.filter(Boolean).join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hashBuffer);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex;
}
