const express = require('express');
const cors = require('cors');
const contactsRouter = express();
const port = process.env.PORT || 3000;
contactsRouter.use(cors());
const { authenticateToken, authorizeRole } = require("./middleware");
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

contactsRouter.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM contacts ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        res.status(500).json({ error: error.message });
    }
});

contactsRouter.post("/", authenticateToken, authorizeRole(["admin"]), async (req, res) => {
    const { name, email, role, telegram, github, avatar } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO contacts (name, email, role, telegram, github, avatar) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [name, email, role, telegram, github, avatar]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Ошибка при добавлении контакта:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

contactsRouter.put("/:id", authenticateToken, authorizeRole(["admin"]), async (req, res) => {
    const { id } = req.params;
    const { name, email, role, telegram, github, avatar } = req.body;
    try {
        const result = await pool.query(
            "UPDATE contacts SET name = $1, email = $2, role = $3, telegram = $4, github = $5, avatar = $6 WHERE id = $7 RETURNING *",
            [name, email, role, telegram, github, avatar, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Ошибка при обновлении контакта:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

contactsRouter.delete("/:id", authenticateToken, authorizeRole(["admin"]), async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM contacts WHERE id = $1", [id]);
        res.json({ message: "Контакт удален" });
    } catch (error) {
        console.error("Ошибка при удалении контакта:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});


module.exports = contactsRouter;