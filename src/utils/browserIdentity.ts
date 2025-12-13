export type BrowserGeo = {
  lat: number;
  lon: number;
  accuracy?: number;
  country?: string;
  region?: string;
  city?: string;
  asn?: string;
  org?: string;
};

export type BrowserIdentity = {
  ipv4: string | null;
  userAgent: string;
  acceptLanguage: string;
  geo: BrowserGeo | null;
  canvas: string | null;
  webgl: string | null;
  screen: string | null;
  timezone: string;
  cpu?: number;
  memory?: number;
};

const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';
const ENABLE_BROWSER_GEO = false; // GPS geo is mostly blocked/slow, relying on IP geo

// --- Hardware & Browser Signals ---

function getCanvasFingerprint(): string | null {
  if (!isBrowser) return null;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = 200;
    canvas.height = 50;

    // Text with different fonts and styles
    ctx.textBaseline = 'top';
    ctx.font = '14px "Arial"';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Browser FP', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Browser FP', 4, 17);

    // Composite operation to detect blending differences
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgb(255,0,255)';
    ctx.beginPath();
    ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgb(0,255,255)';
    ctx.beginPath();
    ctx.arc(100, 50, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgb(255,255,0)';
    ctx.beginPath();
    ctx.arc(75, 100, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgb(255,0,255)';
    ctx.arc(75, 75, 75, 0, Math.PI * 2, true);
    ctx.arc(75, 75, 25, 0, Math.PI * 2, true);
    ctx.fill('evenodd');

    return canvas.toDataURL();
  } catch (e) {
    return null;
  }
}

function getWebGLFingerprint(): string | null {
  if (!isBrowser) return null;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl || !(gl instanceof WebGLRenderingContext)) return null;

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return null;

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    return `${vendor}~${renderer}`;
  } catch (e) {
    return null;
  }
}

function getScreenInfo(): string {
  if (!isBrowser) return 'unknown';
  return `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}@${window.devicePixelRatio}`;
}

// --- Network & Location Providers ---

async function fetchWithTimeout(url: string, timeoutMs: number = 2000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// Normalized result from any provider
type NetworkIdentity = {
  ip: string | null;
  geo: BrowserGeo | null;
};

// 1. Cloudflare Trace (Fastest, reliable IP, basic loc)
// Returns text like: ip=1.2.3.4 \n loc=BR \n colo=GRU
async function fetchCloudflare(): Promise<NetworkIdentity | null> {
  try {
    const r = await fetchWithTimeout('https://www.cloudflare.com/cdn-cgi/trace');
    if (!r.ok) return null;
    const text = await r.text();
    const map: Record<string, string> = {};
    text.split('\n').forEach(line => {
      const [k, v] = line.split('=');
      if (k && v) map[k] = v;
    });
    if (!map.ip) return null;
    return {
      ip: map.ip,
      geo: {
        lat: 0,
        lon: 0, // Cloudflare trace doesn't give lat/lon, only country code usually
        country: map.loc, // "BR"
        region: '',
        city: '', // Trace doesn't give city usually
      }
    };
  } catch { return null; }
}

// 2. ipapi.co (Detailed location)
async function fetchIpApi(): Promise<NetworkIdentity | null> {
  try {
    const r = await fetchWithTimeout('https://ipapi.co/json/');
    if (!r.ok) return null;
    const j = await r.json();
    if (!j.ip) return null;
    return {
      ip: j.ip,
      geo: {
        lat: j.latitude,
        lon: j.longitude,
        country: j.country_code,
        region: j.region,
        city: j.city,
        asn: j.asn,
        org: j.org
      }
    };
  } catch { return null; }
}

// 3. ipwho.is (Robust fallback)
async function fetchIpWho(): Promise<NetworkIdentity | null> {
  try {
    const r = await fetchWithTimeout('https://ipwho.is/');
    if (!r.ok) return null;
    const j = await r.json();
    if (!j.success) return null;
    return {
      ip: j.ip,
      geo: {
        lat: j.latitude,
        lon: j.longitude,
        country: j.country_code,
        region: j.region,
        city: j.city,
        asn: j.connection?.asn?.toString(),
        org: j.connection?.org
      }
    };
  } catch { return null; }
}

// 4. db-ip (Another fallback)
async function fetchDbIp(): Promise<NetworkIdentity | null> {
  try {
    const r = await fetchWithTimeout('https://api.db-ip.com/v2/free/self');
    if (!r.ok) return null;
    const j = await r.json();
    if (!j.ipAddress) return null;
    return {
      ip: j.ipAddress,
      geo: {
        lat: 0,
        lon: 0,
        country: j.countryCode,
        region: j.stateProv,
        city: j.city,
      }
    };
  } catch { return null; }
}

async function getNetworkIdentity(): Promise<NetworkIdentity> {
  if (!isBrowser) return { ip: null, geo: null };

  // Run reliable providers in parallel-ish or raced
  // Strategy: Try ipapi first (best data). If fails/slow => fallback group (cloudflare, ipwho).

  // Try high-quality detailed provider first with strict timeout
  const detailed = await fetchIpApi();
  if (detailed && detailed.ip) return detailed;

  // Fallback group: first to resolve wins
  const fallback = await Promise.any([
    fetchIpWho(),
    fetchDbIp(),
    fetchCloudflare()
  ].map(p => p.catch(() => null)));

  if (fallback) return fallback;

  return { ip: null, geo: null };
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
  if (!isBrowser) {
    return {
      ipv4: null,
      userAgent: '',
      acceptLanguage: '',
      geo: null,
      canvas: null,
      webgl: null,
      screen: null,
      timezone: 'UTC'
    };
  }

  // Identity logic:
  // 1. Hardware/Browser signals (Sync)
  const canvas = getCanvasFingerprint();
  const webgl = getWebGLFingerprint();
  const screenInfo = getScreenInfo();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const cpu = navigator.hardwareConcurrency;
  // @ts-ignore
  const memory = navigator.deviceMemory;

  // 2. Network signals (Async)
  const net = await getNetworkIdentity();

  // 3. Combine
  return {
    ipv4: net.ip,
    userAgent: getUserAgent(),
    acceptLanguage: getAcceptLanguage(),
    geo: net.geo,
    canvas,
    webgl,
    screen: screenInfo,
    timezone,
    cpu,
    memory
  };
}

export async function computeFingerprint(identity: BrowserIdentity): Promise<string> {
  // ROBUST FINGERPRINTING RULES:
  // We explicitly EXCLUDE IP, Geo, Timezone from the hash base to allow tracking across:
  // - VPN changes
  // - Moving from Home (WiFi) to Street (4G)
  // - Minor updates

  // We rely on stable hardware/browser traits:
  const fingerprintComponents = [
    identity.canvas, // Strongest entropy
    identity.webgl,  // Strong hardware identifier
    identity.screen,
    identity.cpu?.toString(),
    identity.memory?.toString(),
    identity.userAgent, // Can change on update, but acceptable tradeoff for precision
    identity.acceptLanguage, // Usually stable
    // 'doNotTrack' status could be added but often varies
  ];

  const text = fingerprintComponents.filter(Boolean).join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hashBuffer);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex;
}
