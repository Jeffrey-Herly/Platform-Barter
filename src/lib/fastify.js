import fastifyView from '@fastify/view';
import fastifyFormbody from '@fastify/formbody';
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

// Register form body parser for handling form data and JSON
app.register(fastifyFormbody);
console.log("berhasil mendaftarkan form body parser");

// daftarkan direktori view sebagai tempat penyimpanan file template
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



export default app;