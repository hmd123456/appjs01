 
require('dotenv').config({ path: './process.env' });

const mysql = require('mysql2/promise');

// Environment variables for database connection
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    throw new Error('Database connection details are not defined in environment variables.');
}

// Create a MySQL connection pool
const dbPool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

/**
 * Logs file upload activity to the database.
 * @param {string} sectionName - The section where the file was uploaded.
 * @param {string} fileName - The name of the uploaded file.
 */
async function logFileUpload(sectionName, fileName) {
    try {
        const connection = await dbPool.getConnection();
        const query = 'INSERT INTO file_uploads (section_name, file_name) VALUES (?, ?)';
        await connection.execute(query, [sectionName, fileName]);
        connection.release();
        console.log(`Logged upload activity for file "${fileName}" in section "${sectionName}".`);
    } catch (error) {
        console.error('Error logging file upload activity:', error.message);
    }
}

module.exports = { logFileUpload };