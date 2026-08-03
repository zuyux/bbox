import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
const OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const derive = (password: string, salt: Buffer) => new Promise<Buffer>((resolve, reject) => {
  scrypt(password.normalize('NFKC'), salt, 32, OPTIONS, (error, key) => error ? reject(error) : resolve(key));
});

export async function createPasswordVerifier(password: string) {
  const salt = randomBytes(16);
  const derived = await derive(password, salt);
  return { passwordSalt: salt.toString('base64'), passwordHash: derived.toString('base64') };
}

export async function verifyPassword(password: string, saltBase64: string, hashBase64: string) {
  const expected = Buffer.from(hashBase64, 'base64');
  if (expected.length !== 32) return false;
  const actual = await derive(password, Buffer.from(saltBase64, 'base64'));
  return timingSafeEqual(actual, expected);
}
