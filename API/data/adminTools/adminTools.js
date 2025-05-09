const express = require("express");
const fs = require("fs");
const path = require("path");
const { authenticateToken, authorizeRole } = require("../middleware");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

router.get("/", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: "Ошибка чтения пользователей" });
    }
});

router.put("/:id", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { id } = req.params;
    const { login, username, lastname, email, password, role, usergroup } = req.body;
    try {
        const result = await pool.query(
            `UPDATE users 
       SET login = $1, username = $2, lastname = $3, email = $4, password = $5, role = $6, usergroup = $7 
       WHERE id = $8 RETURNING *`,
            [login, username, lastname, email, password, role, usergroup, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete("/:id", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json({ message: 'Пользователь удален', user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch("/:id/reset-password", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    try {
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const result = await pool.query(
            'UPDATE users SET password = $1 WHERE id = $2 RETURNING *',
            [hashedPassword, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json({ message: 'Пароль успешно изменен', user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/groups", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    try {
        const result = await pool.query('SELECT DISTINCT usergroup FROM users');
        res.json(result.rows.map(row => row.usergroup));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put("/:id/group", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { id } = req.params;
    const { newGroup } = req.body;
    try {
        const result = await pool.query(
            'UPDATE users SET usergroup = $1 WHERE id = $2 RETURNING *',
            [newGroup, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put("/:id/codegroup", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { id } = req.params;
    const { newGroup } = req.body;
    try {
        const result = await pool.query(
            'UPDATE users SET codegroup = $1 WHERE id = $2 RETURNING *',
            [newGroup, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/create", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { login, username, lastname, email, password, role, usergroup } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO users (login, username, lastname, email, password, role, usergroup)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [login, username, lastname, email, password, role, usergroup]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
