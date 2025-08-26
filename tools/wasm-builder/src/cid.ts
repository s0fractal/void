/**
 * CID generation for WASM modules
 * Uses CIDv1 with raw codec for deterministic content addressing
 */

import { CID } from 'multiformats/cid';
import * as raw from 'multiformats/codecs/raw';
import { sha256 } from 'multiformats/hashes/sha2';

/**
 * Generate CIDv1 (raw) from bytes
 * This ensures deterministic CIDs for identical WASM modules
 */
export async function generateCID(bytes: Uint8Array): Promise<CID> {
  const hash = await sha256.digest(bytes);
  return CID.createV1(raw.code, hash);
}

/**
 * Verify a CID matches the given bytes
 */
export async function verifyCID(cid: CID | string, bytes: Uint8Array): Promise<boolean> {
  const cidObj = typeof cid === 'string' ? CID.parse(cid) : cid;
  const expectedCID = await generateCID(bytes);
  return cidObj.equals(expectedCID);
}

/**
 * Parse and validate a CID string
 */
export function parseCID(cidString: string): CID {
  try {
    return CID.parse(cidString);
  } catch (error) {
    throw new Error(`Invalid CID: ${cidString}`);
  }
}