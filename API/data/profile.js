const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const {authenticateToken} = require('./middleware');
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { JWT_SECRET, baseBackendUrl } = require("./constants");
const {sendVerificationEmail} = require("../utils/sendEmail");

const router = express.Router();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const UPLOADS_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log("Файл сохраняется в папку:", UPLOADS_DIR);
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${req.user.id}${ext}`);
    },
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error("Неподдерживаемый формат файла"), false);
        }
        cb(null, true);
    },
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.post("/resend-verification", authenticateToken, async (req, res) => {
    const { email } = req.body;
    try {
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        await pool.query("UPDATE users SET verification_code = $1 WHERE email = $2", [verificationCode, email]);
        const result = await pool.query("SELECT login FROM users WHERE email = $1", [email]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }
        await sendVerificationEmail(email, verificationCode);
        res.json({ message: "Письмо с подтверждением отправлено!" });
    } catch (error) {
        console.error("Ошибка повторной отправки email:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

router.post("/verify-email", authenticateToken, async (req, res) => {
    const { email, verification_code } = req.body;
    try {
        const result = await pool.query(
            "SELECT id FROM users WHERE email = $1 AND verification_code = $2",
            [email, verification_code]
        );
        if (result.rowCount === 0) {
            return res.status(400).json({ error: "Неверный код подтверждения" });
        }
        await pool.query("UPDATE users SET email_verified = true, verification_code = NULL WHERE email = $1", [email]);
        res.json({ message: "Email подтверждён!" });
    } catch (error) {
        console.error("Ошибка подтверждения email:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

router.put("/profile", authenticateToken, async (req, res) => {
    const { login, email, username, lastname, usergroup } = req.body;
    const userId = req.user.id;
    try {
        const existingUser = await pool.query(
            "SELECT * FROM users WHERE (login = $1 OR email = $2) AND id <> $3",
            [login, email, userId]
        );
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: "Логин или email уже заняты" });
        }
        await pool.query(
            "UPDATE users SET login = $1, email = $2, username = $3, lastname = $4, usergroup = $5 WHERE id = $6",
            [login, email, username, lastname, usergroup, userId]
        );
        res.json({ message: "Профиль успешно обновлён" });
    } catch (error) {
        console.error("Ошибка обновления профиля:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

router.get("/profile", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const user = await pool.query(
            "SELECT id, login, email, username, lastname, usergroup, codegroup, email_verified, COALESCE(avatar, '') as avatar FROM users WHERE id = $1",
            [userId]
        );
        if (user.rows.length === 0) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }
        const avatarUrl = user.rows[0].avatar
            ? `${baseBackendUrl}/uploads/${user.rows[0].avatar}`
            : "";
        res.json({ ...user.rows[0], avatar: avatarUrl });
    } catch (error) {
        console.error("Ошибка загрузки профиля:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

router.post("/profile/avatar", authenticateToken, upload.single("avatar"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Файл не загружен" });
    }
    const userId = req.user.id;
    try {
        const result = await pool.query("SELECT avatar FROM users WHERE id = $1", [userId]);
        const existingAvatar = result.rows[0]?.avatar;
        const avatarFilename = req.file.filename;
        if (existingAvatar && existingAvatar !== avatarFilename) {
            const oldPath = path.join(process.cwd(), "uploads", existingAvatar);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
                console.log("Старый аватар удалён:", oldPath);
            }
        }
        await pool.query("UPDATE users SET avatar = $1 WHERE id = $2", [avatarFilename, userId]);
        res.json({ message: "Аватар обновлён", avatar: `${baseBackendUrl}/uploads/${avatarFilename}` });
    } catch (error) {
        console.error("Ошибка обновления аватара:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});


module.exports = router;
