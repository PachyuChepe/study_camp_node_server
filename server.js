// server.js
import express from 'express';
import { createServer } from 'node:http';
import { configDotenv } from 'dotenv';
configDotenv();
import attendanceRoutes from './src/routes/attendanceRoutes.js';
import { Server } from 'socket.io';
import cors from 'cors';
import socket from './src/socket.js';
import connectToDatabase from './mongodb.js';
connectToDatabase();

import { createAdapter } from '@socket.io/redis-adapter';
import { pubClient, subClient } from './src/redis/redisClient.js'; // 수정된 임포트 구문

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

// Redis 어댑터 설정
io.adapter(createAdapter(pubClient, subClient));

socket(io);

server.listen(process.env.PORT, () => {
  console.log(`run`);
});
