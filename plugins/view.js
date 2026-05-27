const fp = require('fastify-plugin')

// Register @fastify/view dengan EJS
module.exports = fp(async function (fastify, opts) {    
    fastify.register(require('@fastify/view'), {
        engine: {
            ejs: require('ejs')
        },
        root: 'view', // Path ke folder view
        viewExt: 'ejs'
    });
})
