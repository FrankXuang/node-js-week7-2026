require('dotenv').config();
const { Client } = require('pg');

function createClient() {
  return new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || 'student',
    password: process.env.DB_PASSWORD || 'student666',
    database: process.env.DB_DATABASE || 'livefit',
  });
}

module.exports = { createClient };
