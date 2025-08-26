#!/usr/bin/env node
import fs from 'node:fs';
import { CID } from 'multiformats/cid';
import * as mfsha2 from 'multiformats/hashes/sha2';

const fp = process.argv[2];
if (!fp) { console.error('Usage: node scripts/calc-cid.mjs <file>'); process.exit(2); }
const buf = fs.readFileSync(fp);
const mh = await mfsha2.sha256.digest(buf);
const cid = CID.createV1(0x55, mh); // raw
console.log(cid.toString());
