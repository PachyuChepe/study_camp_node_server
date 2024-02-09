import express from 'express';
import { createServer } from 'node:http';
import { configDotenv } from 'dotenv';
configDotenv();
import attendanceRoutes from './src/routes/attendanceRoutes.js';
import { Server } from 'socket.io';
import cors from 'cors';
import socket from './src/socket.js';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import connectToDatabase from './mongodb.js';
connectToDatabase();

// Redis 클라이언트 생성
const pubClient = createClient({
  url: `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}/0`,
});
const subClient = pubClient.duplicate();

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

(async () => {
  await pubClient.connect();
  await subClient.connect();

  // socket.io-redis 어댑터 설정
  io.adapter(createAdapter(pubClient, subClient));
  socket(io);
  server.listen(process.env.PORT, () => {
    console.log(`Server listening on port  ${process.env.PORT}`);
  });
})();

// // setupRedisAdapter(io).then(() => {
// socket(io);
// // });

// server.listen(process.env.PORT, () => {
//   console.log(`Server running on port ${process.env.PORT}`);
// });
