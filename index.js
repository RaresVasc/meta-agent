import dotenv from 'dotenv';
import { runMetaAgent } from './metaAgent.js';

dotenv.config();

const [,, intentArg, ...descParts] = process.argv;
const intent = intentArg || 'bootstrap';
const description = descParts.join(' ') || 'Initializare meta-agent';

// top-level await is supported in Node 18+ when using ESM
await runMetaAgent({ intent, description });
