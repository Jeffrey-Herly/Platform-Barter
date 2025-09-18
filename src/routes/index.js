export default async function routes(app, opts) {
  // Route untuk menampilkan tampilan dari views/index.njk
  app.get('/index', async (req, reply) => {
    console.log('berhasil masuk ke index');
    return reply.view('index.njk', { title: 'Welcome to Index Page' });
  });

  // Route halaman kedua untuk tes navigasi
  app.get('/second', async (req, reply) => {
    console.log('masuk ke second');
    return reply.view('second.njk', { title: 'Second Page' });
  });

  // API: hardcoded data untuk Webix
  app.get('/api/users', async (req, reply) => {
    const users = [
      { id: 1, name: 'John Doe', age: 30, email: 'john@example.com', role: 'Admin' },
      { id: 2, name: 'Jane Smith', age: 25, email: 'jane@example.com', role: 'Editor' },
      { id: 3, name: 'Sam Johnson', age: 35, email: 'sam@example.com', role: 'Viewer' },
      { id: 4, name: 'Alice Lee', age: 28, email: 'alice@example.com', role: 'Editor' }
    ];
    return reply.send(users);
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