import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import type { Server } from 'socket.io';
import { config } from './config/index.js';
import { ApiError, originDefense } from './middleware/security.js';
import { apiRouter } from './controllers/api.js';
export function createApp(getIo:()=>Server|undefined=()=>undefined){const app=express();app.disable('x-powered-by');app.use(helmet(),cors({origin:config.origin,credentials:true}),express.json({limit:'32kb'}),cookieParser(),originDefense);app.get('/api/health',(_req,res)=>res.status(mongoose.connection.readyState===1?200:503).json({data:{status:mongoose.connection.readyState===1?'ok':'database unavailable'}}));app.use('/api',apiRouter(getIo));app.use((_req,res)=>res.status(404).json({error:{message:'Route not found'}}));app.use((error:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{const status=error instanceof ZodError?400:error instanceof ApiError?error.status:error.code===11000||error.name==='VersionError'?409:error.status===413?413:500;res.status(status).json({error:{message:error instanceof ZodError?'Invalid input':status===500?'Service unavailable':status===409?'Conflict: refresh or check duplicate data':error.message}});});return app;}
