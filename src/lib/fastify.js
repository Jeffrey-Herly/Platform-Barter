import fastifyView from '@fastify/view';
import Fastify from 'fastify';
import nunjucks from 'nunjucks';
import { join } from 'path';

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
console.log("berhasil membuat instance fastify");

// Gunakan path absolut untuk root views
app.register(fastifyView, {
  engine: {
    nunjucks: nunjucks
  },
  root: join(process.cwd(), 'src/views'),
  layout: false,
  options: {
    nunjucks: {
        noCache: true,
        watch: false
    }
  }
});
console.log("berhasil mendaftarkan view");