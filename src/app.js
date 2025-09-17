import app from './lib/fastify.js';

app.setErrorHandler(function (error, request, reply) {
  // Log error
  this.log.error(error);
});

// root
app.get('/', async (request, reply) => {
  return { hello: 'hallo' };
});

app.route({
  method: 'GET',
  url: '/testing/:name', // <-- pakai huruf kecil agar tidak rancu
  schema: {
    params: {
      type: 'object',                 // <-- WAJIBKAN object
      properties: {
        name: { type: 'string' }
      },
      required: ['name'],
      additionalProperties: false
    },
    response: {
      200: {
        type: 'object',               // <-- WAJIBKAN object
        properties: {
          message: { type: 'string' }
        },
        required: ['message'],
        additionalProperties: false
      },
      500: {
        type: 'object',
        properties: {
          error: { type: 'string' }
        },
        required: ['error'],
        additionalProperties: false
      }
    }
  },
  handler: (req, reply) => {
    try {
      // gunakan logger bawaan Fastify
      console.log({ params: req.params }, 'parameter dikirim');

      const { name } = req.params;
      const message = { messae: `Hello, ${name}!` };
      return reply.send(message);
    } catch (err) {      
      return reply.redirect('/');
    }
  }
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