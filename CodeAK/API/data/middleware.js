const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const {JWT_SECRET} = require("./constants");
const usersFile = path.join(__dirname, "users.json");
const { Pool } = require('pg');
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const authenticateToken = async (req, res, next) => {
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Требуется авторизация" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userResult = await pool.query("SELECT id, role FROM users WHERE id = $1", [decoded.id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }
        req.user = userResult.rows[0];
        next();
    } catch (error) {
        return res.status(403).json({ message: "Неверный токен" });
    }
};

const authorizeRole = (roles) => async (req, res, next) => {
    try {
        const userId = req.user.id;
        const result = await pool.query("SELECT role FROM users WHERE id = $1", [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }
        const userRole = result.rows[0].role;
        if (!roles.includes(userRole)) {
            return res.status(403).json({ message: "Доступ запрещён" });
        }
        next();
    } catch (error) {
        console.error("Ошибка при проверке роли:", error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
};

const getUserRole = async (userId) => {
    try {
        const result = await pool.query("SELECT role FROM users WHERE id = $1", [userId]);

        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0].role;
    } catch (error) {
        console.error("Ошибка при получении роли пользователя:", error);
        return null;
    }
};

module.exports = { authenticateToken, getUserRole, authorizeRole };
