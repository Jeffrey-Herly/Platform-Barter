import app from './lib/fastify.js';
import registerRoutes from './routes/routes.js';

app.setErrorHandler(function (error, request, reply) {
  // Log error
  this.log.error(error);
});

await app.register(view, {
  engine: { nunjucks },
  root: join(__dirname, "src", "views"),
  viewExt: "njk",
  options: { noCache: true }   // perubahan .njk terlihat cukup refresh
});


await registerRoutes(app);


// root
app.get('/', async (request, reply) => {
  // Redirect to /index
  console.log('redirect to /index');
  return reply.redirect('/index');
});

// define server connection
try {
  // start server at port 2000
  app.listen({ port: 2000 });

  // give feedback that server is running
  app.log.info(`Server are now running at http://localhost:2000/`);
  
} catch (err) {
    // trow error if server failed to start and exit the process
    app.log.error(err);
    process.exit(1);
}