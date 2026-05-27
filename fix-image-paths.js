const { Client } = require('pg');
require('dotenv').config();

async function checkPaths() {
    const client = new Client({
        host: process.env.PG_HOST,
        port: Number(process.env.PG_PORT || 5432),
        database: process.env.PG_DATABASE,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD
    });

    try {
        await client.connect();
        
        let res = await client.query(`SELECT image_url FROM item_images WHERE image_url NOT LIKE '%picsum%' LIMIT 10`);
        console.log("Local images item_images:", res.rows);

        res = await client.query(`SELECT avatar_url, cover_url FROM user_profiles WHERE avatar_url IS NOT NULL OR cover_url IS NOT NULL LIMIT 10`);
        console.log("Local images user profile:", res.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkPaths();
