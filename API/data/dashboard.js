const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { authenticateToken, authorizeRole } = require("./middleware");

const dashboardRouter = express();
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

dashboardRouter.get('/', authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    try {
        const totalUsersResult = await pool.query('SELECT COUNT(*) FROM users');
        const activeUsersResult = await pool.query(
            "SELECT COUNT(*) FROM users WHERE last_active >= NOW() - INTERVAL '10 minutes'"
        );
        const newRegistrationsResult = await pool.query(
            "SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '1 day'"
        );
        const chartResult = await pool.query(`SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date, COUNT(*) AS value FROM users WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY date ORDER BY date`);
        const summary = {
            totalUsers: parseInt(totalUsersResult.rows[0].count, 10),
            activeUsers: parseInt(activeUsersResult.rows[0].count, 10),
            newRegistrations: parseInt(newRegistrationsResult.rows[0].count, 10),
        };
        res.json({
            summary,
            chartData: chartResult.rows,
        });
    } catch (error) {
        console.error('Ошибка получения данных дашборда:', error);
        res.status(500).json({ error: error.message });
    }
});


module.exports = dashboardRouter;