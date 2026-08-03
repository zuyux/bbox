export const PROFILE_PROOF_VERSION = 1;
export const PROFILE_PROOF_TTL_MS = 5 * 60 * 1000;

export type ProfileMutationProof = {
  version: number;
  method: string;
  path: string;
  address: string;
  payload: string;
  nonce: string;
  expiresAt: string;
  signature: string;
  publicKey: string;
  walletType?: string;
  signedPayload?: string;
};

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().filter(key => record[key] !== undefined).map(
    key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`
  ).join(',')}}`;
}

export function stripProfileProof<T extends Record<string, unknown>>(body: T) {
  const payload = { ...body };
  delete payload.profileMutationProof;
  return payload;
}

export function profileProofMessage(proof: Omit<ProfileMutationProof, 'signature' | 'publicKey' | 'walletType' | 'signedPayload'>): string {
  return canonicalJson({
    action: 'bbox_profile_mutation',
    version: proof.version,
    method: proof.method.toUpperCase(),
    path: proof.path,
    address: proof.address,
    payload: proof.payload,
    nonce: proof.nonce,
    expiresAt: proof.expiresAt,
  });
}

export function createUnsignedProfileProof(
  method: string,
  path: string,
  address: string,
  payload: Record<string, unknown>,
): Omit<ProfileMutationProof, 'signature' | 'publicKey' | 'walletType' | 'signedPayload'> {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return {
    version: PROFILE_PROOF_VERSION,
    method: method.toUpperCase(),
    path,
    address,
    payload: canonicalJson(payload),
    nonce: Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join(''),
    expiresAt: new Date(Date.now() + PROFILE_PROOF_TTL_MS).toISOString(),
  };
}
