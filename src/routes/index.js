// filepath: /home/jeffrey-herly/Kuliah/TTU/src/routes/index.js
async function routes(fastify, options) {
  fastify.get('/', (req, reply) => {
    reply.view('index.njk', { name: 'Fastify + Nunjucks' });
  });
}
module.exports = routes;