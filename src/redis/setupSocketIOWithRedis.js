import { createAdapter } from '@socket.io/redis-adapter';
import redisClient from './redisClient.js';

// Redis 어댑터를 설정하는 함수
async function setupRedisAdapter(io) {
  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();

  // pub/sub 클라이언트 연결
  await Promise.all([pubClient.connect(), subClient.connect()]);

  // Socket.IO 인스턴스에 Redis 어댑터 적용
  io.adapter(createAdapter(pubClient, subClient));
}

export default setupRedisAdapter;
