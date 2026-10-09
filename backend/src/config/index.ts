import 'dotenv/config';
export const config = { port: Number(process.env.PORT || 3000), mongo: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/supportpilot?replicaSet=rs0', origin: process.env.APP_ORIGIN || 'http://127.0.0.1:4200', production: process.env.NODE_ENV === 'production' };
