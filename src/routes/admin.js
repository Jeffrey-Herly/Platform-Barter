export default async function adminRoutes(app, opts) {
  app.get('/admin', async (req, reply) => {
    console.log('masuk ke admin');
    return reply.view('admin.njk', { title: 'Admin Page' });
  });
}