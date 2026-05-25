const { pool } = require('./db/pool');

const connectDB = async () => {
    try {
        await pool.query('SELECT 1');

        console.log("PostgreSQL Connected");
    } catch (error) {
        console.log("PostgreSQL Connection Error:", error);
        process.exit(1);
    }
};

module.exports = connectDB;
