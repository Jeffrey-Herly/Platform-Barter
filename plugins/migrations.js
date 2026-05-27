'use strict'

import fp from 'fastify-plugin'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default fp(async (fastify, opts) => {
    try {
        console.log('\n📦 Starting database migrations...')
        
        const client = await fastify.pg.connect()
        
        try {
            // Get all migration files sorted by name
            const migrationsDir = path.join(__dirname, '..', 'migrations')
            const migrationFiles = fs.readdirSync(migrationsDir)
                .filter(file => file.endsWith('.sql'))
                .sort()
            
            console.log(`Found ${migrationFiles.length} migration files`)
            
            // Create migrations tracking table if it doesn't exist
            const trackingTableQuery = `
                CREATE TABLE IF NOT EXISTS public.schema_migrations (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) UNIQUE NOT NULL,
                    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `
            
            await client.query(trackingTableQuery)
            console.log('✅ Schema migrations table ready')
            
            // Execute each migration file
            for (const file of migrationFiles) {
                try {
                    // Check if migration already executed
                    const checkResult = await client.query(
                        'SELECT id FROM public.schema_migrations WHERE name = $1',
                        [file]
                    )
                    
                    if (checkResult.rows.length > 0) {
                        console.log(`⏭️  Skipping ${file} (already executed)`)
                        continue
                    }
                    
                    // Read and execute migration
                    const filePath = path.join(migrationsDir, file)
                    const sqlContent = fs.readFileSync(filePath, 'utf-8')
                    
                    console.log(`\n▶️  Running migration: ${file}`)
                    
                    // Execute migration with error handling
                    try {
                        await client.query(sqlContent)
                        console.log(`✅ Completed: ${file}`)
                    } catch (execError) {
                        // Handle known safe errors
                        const errorMsg = execError.message.toLowerCase()
                        const isSafeError = errorMsg.includes('already exists') || 
                                          errorMsg.includes('duplicate key') ||
                                          errorMsg.includes('already') ||
                                          (errorMsg.includes('column') && errorMsg.includes('exists'))
                        
                        if (isSafeError) {
                            console.log(`✓  ${file} schema already applied (safe error)`)
                        } else {
                            console.error(`   ⚠️  Error in ${file}:`, execError.message)
                            throw execError
                        }
                    }
                    
                    // Record migration as executed
                    try {
                        await client.query(
                            'INSERT INTO public.schema_migrations (name) VALUES ($1)',
                            [file]
                        )
                    } catch (e) {
                        // Already recorded, ignore
                        console.log(`   (${file} already recorded in migrations table)`)
                    }
                } catch (migrationError) {
                    console.error(`❌ Error processing ${file}:`, migrationError.message)
                    throw migrationError
                }
            }
            
            console.log('\n✨ All migrations completed successfully!\n')
            
        } finally {
            client.release()
        }
    } catch (error) {
        console.error('\n❌ Migration error:')
        console.error('   Message:', error.message)
        console.error('   Details:', error)
        
        // Log but don't stop the application
        // Comment out the throw if you want app to continue despite migration errors
        console.error('\n⚠️  Warning: Application may not function properly without migrations')
    }
})
