# @void/codex-sdk (TypeScript)

Tiny client for the Void Codex API.

```ts
import { CodexClient } from "@void/codex-sdk";
import crypto from "crypto";

const secret = process.env.CODEX_HMAC_SECRET || "";
const signer = (raw: string) => crypto.createHmac("sha256", secret).update(raw).digest("hex");
const codex = new CodexClient(process.env.CODEX_URL || "http://localhost:8788", process.env.CODEX_API_KEY, signer);

const plan = await codex.plan({ intent: "stabilize ipfs", context: { incidents: ["ipfs:degraded"] } });
console.log(plan);
```
