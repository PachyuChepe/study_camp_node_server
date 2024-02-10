// src/redis/redisClient.js
import { configDotenv } from 'dotenv';
configDotenv();
import redis from 'redis';

// Redis 클라이언트 인스턴스 생성
const redisClient = redis.createClient({
  url: `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}/0`,
});

// Redis 에러 핸들링을 위한 이벤트 리스너 설정
redisClient.on('error', (error) => console.error(`Redis Error: ${error}`));

// Redis 클라이언트 연결 성공 이벤트 리스너 추가
redisClient.on('connect', () =>
  console.log('Redis client connected successfully'),
);

// Redis 클라이언트 연결 수행
// redisClient.connect().catch(console.error);

export default redisClient;
