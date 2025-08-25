#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { packToFs } from 'ipfs-car/pack/fs';
import { CID } from 'multiformats/cid';
import * as mfsha2 from 'multiformats/hashes/sha2';

const [,, inFile, outCar] = process.argv;
if (!inFile || !outCar) {
  console.error('Usage: node scripts/pack-car.mjs <in.wasm> <out.car>');
  process.exit(2);
}
const data = fs.readFileSync(inFile);
const mh = await mfsha2.sha256.digest(data);
const cid = CID.createV1(0x55, mh);

await packToFs({
  input: [{ path: path.basename(inFile), content: data }],
  output: outCar,
  wrapWithDirectory: false,
  maxChunkSize: 262144
});
console.error(`✔ packed CAR → ${outCar}  root=${cid}`);
console.log(cid.toString());
