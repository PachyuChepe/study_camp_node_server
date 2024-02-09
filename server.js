import express from 'express';
import { createServer } from 'node:http';
import { configDotenv } from 'dotenv';
configDotenv();
import attendanceRoutes from './src/routes/attendanceRoutes.js';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import cors from 'cors';
import socket from './src/socket.js';
import connectToDatabase from './mongodb.js';
connectToDatabase();

const app = express();
app.use(express.json());
const server = createServer(app);

app.use(
  cors({
    origin: [process.env.CLIENT, process.env.SOCKET, process.env.DB],
    credentials: true,
  }),
);

// 출석 관련 라우트 추가
app.use(attendanceRoutes);
app.use(express.static('back-office'));

const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT, process.env.SOCKET, process.env.DB],
    credentials: true,
  },
});

// Redis 클라이언트 생성 및 어댑터 설정
const redisUrl = `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;
const pubClient = new Redis(redisUrl);
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));

pubClient.on('connect', () =>
  console.log('Publisher client connected to Redis'),
);
subClient.on('connect', () =>
  console.log('Subscriber client connected to Redis'),
);

pubClient.on('error', (err) => console.log('Redis Pub Client Error', err));
subClient.on('error', (err) => console.log('Redis Sub Client Error', err));

socket(io);

server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
