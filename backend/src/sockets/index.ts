import { Server } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { authenticate } from '../middleware/security.js';
import { config } from '../config/index.js';
import { Ticket } from '../models/index.js';
export function attachSockets(server:HttpServer){const io=new Server(server,{cors:{origin:config.origin,credentials:true},allowRequest:(req,done)=>done(null,req.headers.origin===config.origin)});
io.use(async(socket,next)=>{try{const token=socket.handshake.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('sp_session='))?.slice(11);const auth=await authenticate(token);if(!auth)return next(new Error('Unauthorized'));socket.data.token=token;socket.data.identity=auth.identity;socket.data.sessionId=String(auth.session._id);next();}catch{next(new Error('Unauthorized'));}});
io.on('connection',socket=>{const identity=socket.data.identity;socket.join(`user:${identity.id}`);socket.join(`session:${socket.data.sessionId}`);if(identity.role!=='customer')socket.join('staff');socket.on('subscribe',async(id:string,ack:(ok:boolean)=>void)=>{try{const auth=await authenticate(socket.data.token);const ticket=typeof id==='string'&&/^[a-f\d]{24}$/i.test(id)?await Ticket.findOne({_id:id,...(identity.role==='customer'?{customerId:identity.id}:{})}):null;if(!auth||!ticket){ack?.(false);return;}socket.join(`ticket:${id}:${identity.role==='customer'?'public':'staff'}`);ack?.(true);}catch{ack?.(false);}});socket.on('unsubscribe',(id:string)=>{socket.leave(`ticket:${id}:public`);socket.leave(`ticket:${id}:staff`);});});
const timer=setInterval(async()=>{for(const socket of io.sockets.sockets.values()){try{if(!await authenticate(socket.data.token))socket.disconnect(true);}catch{socket.disconnect(true);}}},5000);timer.unref();io.on('close',()=>clearInterval(timer));return io;}
export async function publish(io:Server,id:string,internal=false){const ticket=await Ticket.findById(id);if(!ticket)return;
// Invalidation events carry no message, note, draft or activity contents.
for(const socket of io.sockets.sockets.values()){try{const auth=await authenticate(socket.data.token);if(!auth){socket.disconnect(true);continue;}const customer=auth.identity.role==='customer';if(customer&&(internal||auth.identity.id!==String(ticket.customerId)))continue;socket.emit('ticket:changed',{id});}catch{socket.disconnect(true);}}
}
