// // src/redis/redisClient.js
// import { configDotenv } from 'dotenv';
// configDotenv();
// import redis from 'redis';

// // Redis 클라이언트 인스턴스 생성
// const redisClient = redis.createClient({
//   url: `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}/0`,
// });

// // Redis 에러 핸들링을 위한 이벤트 리스너 설정
// redisClient.on('error', (error) => console.error(`Redis Error: ${error}`));

// // Redis 클라이언트 연결 성공 이벤트 리스너 추가
// redisClient.on('connect', () =>
//   console.log('Redis client connected successfully'),
// );

// // Redis 클라이언트 연결 수행
// // redisClient.connect().catch(console.error);

// export default redisClient;

// src/redis/redisClient.js
import { createClient } from 'redis'; // 수정된 임포트 구문
import { configDotenv } from 'dotenv';
configDotenv();

const redisClient = createClient({
  url: `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}/0`,
});

// Redis 연결 상태 확인
redisClient.on('connect', () => console.log('Redis client connected'));
redisClient.on('error', (err) =>
  console.log('Redis client connection error:', err),
);

await redisClient.connect(); // Redis 클라이언트 연결

// Pub/Sub을 위해 duplicate() 메소드를 사용하여 새 인스턴스 생성
const pubClient = redisClient.duplicate();
const subClient = redisClient.duplicate();

// pubClient와 subClient 연결
await Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => console.log('Redis Pub/Sub clients connected'))
  .catch((err) => console.log('Error connecting Redis Pub/Sub clients:', err));

export { redisClient, pubClient, subClient };
