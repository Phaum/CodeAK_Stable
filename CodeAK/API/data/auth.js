require('dotenv').config();
const { Pool } = require('pg');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const {sendEmail, sendVerificationEmail} = require('../utils/sendEmail');
const {baseFrontEndUrl, JWT_SECRET} = require("./constants");
const router = express.Router();
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const generateToken = (user) => {
    return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
};
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ error: 'Нет токена, доступ запрещен' });

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Недействительный токен' });
    }
};

router.post('/register', async (req, res) => {
    const { login, username, lastname, usergroup, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await pool.query('INSERT INTO users (login, username, lastname, usergroup, email, password) VALUES ($1, $2, $3, $4, $5, $6)',
            [login, username, lastname, usergroup, email, hashedPassword]
        );
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        await pool.query("UPDATE users SET verification_code = $1 WHERE email = $2", [verificationCode, email]);
        await sendVerificationEmail(email, verificationCode);
        res.json({message:'Успешная регистрация! Теперь вы можете войти.'})
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post("/verify-email", async (req, res) => {
    const { email, code } = req.body;
    try {
        const result = await pool.query("SELECT verification_code FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }
        if (result.rows[0].verification_code !== code) {
            return res.status(400).json({ error: "Неверный код" });
        }
        await pool.query("UPDATE users SET email_verified = true WHERE email = $1", [email]);
        res.json({ message: "Email подтверждён!" });
    } catch (error) {
        console.error("Ошибка подтверждения email:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

router.post('/login', async (req, res) => {
    const { loginoremail, password } = req.body;
    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1 OR login = $1', [loginoremail]);
        if (user.rows.length === 0) return res.status(400).json({ error: 'Неверный логин или email или пароль' });
        const isMatch = await bcrypt.compare(password, user.rows[0].password);
        if (!isMatch) return res.status(400).json({ error: 'Неверный логин или email или пароль' });
        const token = generateToken(user.rows[0]);
        res.json({ token, user: { id: user.rows[0].id, login: user.rows[0].login, role: user.rows[0].role } });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/active', authMiddleware, async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "Неавторизованный доступ" });
        }

        await pool.query("UPDATE users SET last_active = NOW() WHERE id = $1", [req.user.id]);
        res.json({ message: "Heartbeat received" });
    } catch (error) {
        console.error("Ошибка обновления last_active:", error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await pool.query('SELECT id, login, email, role FROM users WHERE id = $1', [req.user.id]);
        if(!user){
            res.status(404).json({ message: 'Ошибка сервера' });
        }
        res.json(user.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка загрузки профиля' });
    }
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userResult.rows.length === 0) return res.status(404).json({ message: 'Пользователь не найден' });

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 3600000); // 1 час

        await pool.query(
            "UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3",
            [resetToken, resetExpires, email]
        );

        const resetLink = `${baseFrontEndUrl}/reset-password/${resetToken}`;
        await sendEmail(email, 'Сброс пароля', `Привет, это проект Code.ak!\nЕсли вы не запрашивали смену пароля, не переходите по ссылке!\nДля смены пароля, перейдите по ссылке:\n${resetLink}`);

        res.json({ message: 'Ссылка на сброс пароля отправлена' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        const userResult = await pool.query(
            "SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()",
            [token]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: 'Неверный или истекший токен' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            "UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE reset_password_token = $2",
            [hashedPassword, token]
        );

        res.json({ message: 'Пароль успешно изменён' });
    } catch (error) {
        console.error('Ошибка сброса пароля:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

module.exports = router;
