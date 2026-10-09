import mongoose from 'mongoose';
import { createServer } from 'node:http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { attachSockets } from './sockets/index.js';
await mongoose.connect(config.mongo,{serverSelectionTimeoutMS:5000});
const server=createServer(createApp(()=>io));const io=attachSockets(server);
server.listen(config.port,'127.0.0.1',()=>console.log(`SupportPilot API on http://127.0.0.1:${config.port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{io.close();server.close(()=>{void mongoose.disconnect().then(()=>process.exit(0));});});
