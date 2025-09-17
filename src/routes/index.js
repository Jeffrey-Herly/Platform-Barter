import app from '../lib/fastify.js';

// Route untuk menampilkan tampilan dari views/index.njk
app.get('/index', async (req, reply) => {
  return reply.view('index.njk', { title: 'Welcome to Index Page' });
});