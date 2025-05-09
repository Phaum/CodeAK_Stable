const express = require("express");
const { Pool } = require("pg");
const { authenticateToken } = require("./middleware");
const TelegramBot = require("node-telegram-bot-api");

const reportsRouter = express.Router();
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const adminChatId = process.env.ADMIN_CHAT_ID;

reportsRouter.get("/user", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(
            "SELECT id, message, status, admin_response, created_at FROM reports WHERE user_id = $1 ORDER BY created_at DESC",
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Ошибка получения репортов:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

reportsRouter.post("/send", authenticateToken, async (req, res) => {
    const { message } = req.body;
    const userId = req.user.id;
    try {
        const userResult = await pool.query("SELECT login, email FROM users WHERE id = $1", [userId]);
        if (userResult.rowCount === 0) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }
        const { login, email } = userResult.rows[0];
        const reportMessage = `📩 *Новый репорт от ${login} (${email}):*\n\n${message}`;
        const sentMessage = await bot.sendMessage(adminChatId, reportMessage, {
            parse_mode: "Markdown",
        });
        await pool.query(
            "INSERT INTO reports (user_id, message, status, tg_message_id) VALUES ($1, $2, 'pending', $3)",
            [userId, message, sentMessage.message_id]
        );
        res.json({ message: "Репорт отправлен!" });
    } catch (error) {
        console.error("Ошибка отправки репорта:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

bot.on("message", async (msg) => {
    if (!msg.reply_to_message) return;
    try {
        const originalMessageId = msg.reply_to_message.message_id;
        const adminReply = msg.text;
        const reportResult = await pool.query(
            "SELECT id, user_id FROM reports WHERE tg_message_id = $1",
            [originalMessageId]
        );
        if (reportResult.rowCount === 0) {
            bot.sendMessage(adminChatId, "⚠️ Ошибка: Репорт не найден в базе данных.");
            return;
        }
        const { id: reportId, user_id } = reportResult.rows[0];
        await pool.query(
            "UPDATE reports SET status = 'resolved', admin_response = $1 WHERE id = $2",
            [adminReply, reportId]
        );
        const userResult = await pool.query("SELECT email FROM users WHERE id = $1", [user_id]);
        if (userResult.rowCount === 0) return;
        const userEmail = userResult.rows[0].email;
        bot.sendMessage(adminChatId, `✅ Ответ пользователю ${userEmail} отправлен:\n\n"${adminReply}"`);
    } catch (error) {
        console.error("Ошибка обработки ответа:", error);
    }
});

module.exports = reportsRouter;