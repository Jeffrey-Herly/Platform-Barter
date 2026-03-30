const fp = require('fastify-plugin');
const path = require('path');

/**
 * Plugin untuk View Engine (EJS) dan Static Files
 * 
 * Handles:
 * - EJS template rendering
 * - Static files serving (CSS, JS, images)
 */
module.exports = fp(async function (fastify, opts) {

    // 2. Register @fastify/static untuk serve public folder
    await fastify.register(require('@fastify/static'), {
        root: path.join(__dirname, '..', 'public'),    // Path ke folder public
        prefix: '/',                                    // URL prefix - serve from root
        constraints: {},                                // Opsional
        decorateReply: true                            // Allow multiple static registrations
    });

    console.log('✅ Static files registered');
    console.log('📁 Public folder:', path.join(__dirname, '..', 'public'));
    console.log('🔗 Access via: /webix/webix.min.js or /js/navbar.js');

}, {
    name: 'view-static-plugin',
    dependencies: []
});