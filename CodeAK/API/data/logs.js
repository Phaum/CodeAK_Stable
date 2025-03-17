const express = require("express");
const fs = require("fs");
const path = require("path");
const { authenticateToken, authorizeRole } = require("./middleware");
const logsRouter = express.Router();

function readLastLines(filePath, maxLines) {
    const data = fs.readFileSync(filePath, "utf8");
    const lines = data.split("\n").filter(line => line.trim() !== "");
    return lines.slice(-maxLines).join("\n");
}

logsRouter.get("/view", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    try {
        const logFilePath = path.join(__dirname, "./logs/user-actions.log");
        if (!fs.existsSync(logFilePath)) {
            return res.status(404).json({ error: "Файл логов не найден" });
        }
        const maxLines = parseInt(req.query.limit) || 100;
        const logs = readLastLines(logFilePath, maxLines);
        res.json({ logs });
    } catch (error) {
        console.error("Ошибка чтения логов:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

module.exports = logsRouter;
