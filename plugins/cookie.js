'use strict'

const fp = require('fastify-plugin')
const fastifyCookie = require('@fastify/cookie')

module.exports = fp(async function (fastify, opts) {
    // Register the @fastify/cookie plugin
    fastify.register(fastifyCookie, {
        secret: process.env.COOKIE_SECRET || 'your-secret-key-change-in-production', // Change this in production!
        parseOptions: {}
    })
})