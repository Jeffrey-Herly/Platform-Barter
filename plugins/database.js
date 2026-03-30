'use strict'

import fp from 'fastify-plugin'
import postgres from '@fastify/postgres'
import dotenv from 'dotenv'
dotenv.config()

export default fp(async (fastify, opts) => {
    try{
        await fastify.register(postgres, {
            host: process.env.PG_HOST,
            port: Number(process.env.PG_PORT || 5432),
            database: process.env.PG_DATABASE,
            user: process.env.PG_USER,
            password: process.env.PG_PASSWORD,
            ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
        })
        
        const client = await fastify.pg.connect()

        try {
            const result = await client.query('SELECT NOW() as time')
            console.log("✅ Database connected successfully!")
            console.log("   Server time:", result.rows[0].time)
        } finally {
            client.release()
        }
        
        console.log("Berhasil terkoneksi ke database")
    } catch(error) {
        console.error("❌ Database connection failed!")
        console.error("   Error:", error.message)
        console.error("   Code:", error.code)

        // Error handling berdasarkan code
        if (error.code === 'ECONNREFUSED') {
            console.error("   → PostgreSQL server is not running")
        } else if (error.code === '28P01') {
            console.error("   → Wrong username or password")
        } else if (error.code === '3D000') {
            console.error("   → Database does not exist")
        }

        throw error // Stop aplikasi jika DB gagal    
    }
})