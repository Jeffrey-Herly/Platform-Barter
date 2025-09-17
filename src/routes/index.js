export default async function routes(app, opts) {
  // Route untuk menampilkan tampilan dari views/index.njk
  app.get('/index', async (req, reply) => {
    console.log('berhasil masuk ke index');
    return reply.view('index.njk', { title: 'Welcome to Index Page' });
  });

  // Route tambahan (contoh)
  app.get('/about', async (req, reply) => {
    return reply.send({ message: 'This is the About page' });
  });

  // Route dengan parameter
  app.get('/hello/:name', async (req, reply) => {
    const { name } = req.params;
    return reply.send({ message: `Hello, ${name}!` });
  });
}