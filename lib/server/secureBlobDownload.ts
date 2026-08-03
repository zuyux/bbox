import { lookup } from 'dns/promises';
import { isIP } from 'net';

export class SecureBlobDownloadError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

function isReservedIp(address: string): boolean {
  const normalized = address.toLowerCase().split('%')[0];
  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && (b === 0 || b === 2 || b === 88)) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0);
  }
  if (isIP(normalized) === 6) {
    const first = Number.parseInt(normalized.split(':')[0] || '0', 16);
    return normalized === '::' || normalized === '::1' || normalized.startsWith('fc') ||
      normalized.startsWith('fd') || /^fe[89ab]/.test(normalized) || normalized.startsWith('ff') ||
      normalized.startsWith('2001:db8:') || normalized.startsWith('2001:0:') ||
      normalized.startsWith('2002:') || normalized.startsWith('::ffff:') || first < 0x2000 || first > 0x3fff;
  }
  return true;
}

async function assertPublicBlobUrl(rawUrl: string, allowedHostname: string) {
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new SecureBlobDownloadError('Invalid Blob URL'); }
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== allowedHostname.toLowerCase() || url.username || url.password || url.port) {
    throw new SecureBlobDownloadError('Blob URL is not on the configured Vercel storage host', 403);
  }
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(result => isReservedIp(result.address))) {
    throw new SecureBlobDownloadError('Blob storage hostname resolved to a private or reserved address', 403);
  }
  return url;
}

export async function downloadVerifiedBlob(args: {
  url: string;
  allowedHostname: string;
  maximumBytes: number;
  expectedKind: 'audio' | 'image';
}): Promise<{ bytes: Uint8Array; contentType: string }> {
  let url = await assertPublicBlobUrl(args.url, args.allowedHostname);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    let response: Response;
    try {
      response = await fetch(url, { redirect: 'manual', signal: controller.signal, headers: { 'User-Agent': 'BBOX-IPFS-Processor/1.0' } });
    } finally { clearTimeout(timeout); }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || redirects === 3) throw new SecureBlobDownloadError('Blob redirect was rejected', 502);
      url = await assertPublicBlobUrl(new URL(location, url).toString(), args.allowedHostname);
      continue;
    }
    if (!response.ok || !response.body) throw new SecureBlobDownloadError('Unable to download Blob object', 502);
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > args.maximumBytes) throw new SecureBlobDownloadError('Blob exceeds the size limit', 413);
    const contentType = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
    if (!contentType.startsWith(`${args.expectedKind}/`)) throw new SecureBlobDownloadError(`Blob is not valid ${args.expectedKind} content`, 415);

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > args.maximumBytes) {
        await reader.cancel();
        throw new SecureBlobDownloadError('Blob exceeds the size limit', 413);
      }
      chunks.push(value);
    }
    if (!total) throw new SecureBlobDownloadError('Blob is empty');
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return { bytes, contentType };
  }
  throw new SecureBlobDownloadError('Too many Blob redirects', 502);
}
