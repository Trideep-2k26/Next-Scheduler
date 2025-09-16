// Test database connection
const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('✅ Successfully connected to database!');
    
    const result = await client.query('SELECT version()');
    console.log('Database version:', result.rows[0].version);
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    console.log('Connection string format:', process.env.DATABASE_URL?.replace(/:[^:]*@/, ':***@'));
  } finally {
    await client.end();
  }
}

testConnection();