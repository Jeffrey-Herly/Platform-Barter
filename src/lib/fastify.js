import Fastify from 'fastify';

const app = Fastify({ 
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
        colorize: true
      }
    }
  } 
});

export default app;