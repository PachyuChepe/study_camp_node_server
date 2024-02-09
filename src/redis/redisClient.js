// redisClient.js
import env from './env.config.js';
import redis from 'redis';

// Redis 클라이언트 인스턴스 생성
const redisClient = redis.createClient({
  url: `redis://${env.REDIS_USERNAME}:${env.REDIS_PASSWORD}@${env.REDIS_HOST}:${env.REDIS_PORT}/0`,
});

// Redis 에러 핸들링을 위한 이벤트 리스너 설정
redisClient.on('error', (error) => console.error(`Redis Error: ${error}`));

// Redis 클라이언트 연결 수행
redisClient.connect().catch(console.error);

export default redisClient;
