const express = require("express");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");

const SECRET_KEY = "your_secret_key";

const rankingRouter = express.Router();

const rankingFile = path.join(__dirname, "ranking.json");
const groupsFile = path.join(__dirname, "groups.json");
const usersFile = path.join(__dirname, "users.json");

const checkUserRole = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        return res.status(403).json({ message: "Заголовок авторизации отсутствует" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(403).json({ message: "Токен отсутствует, авторизация требуется!" });
    }
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            console.error("Ошибка верификации токена:", err);
            return res.status(403).json({ message: "Недействительный токен" });
        }
        try {
            const usersData = fs.readFileSync(usersFile, "utf8");
            const users = JSON.parse(usersData);
            const user = users.find((u) => u.id === decoded.id);
            if (!user) {
                return res.status(403).json({ message: "Пользователь не найден" });
            }
            if (user.role !== "admin" && user.role !== "teacher") {
                return res.status(403).json({ message: "Недостаточно прав" });
            }
            req.user = user;
            next();
        } catch (error) {
            console.error("Ошибка при проверке пользователя:", error);
            return res.status(500).json({ message: "Ошибка сервера при проверке пользователя" });
        }
    });
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        return res.status(403).json({ message: "Заголовок авторизации отсутствует" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(403).json({ message: "Токен отсутствует, доступ запрещен!" });
    }
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            console.error("Ошибка верификации токена:", err);
            return res.status(403).json({ message: "Недействительный токен" });
        }
        req.userId = decoded.id;
        next();
    });
};

rankingRouter.get("/", authenticateToken, (req, res) => {
    try {
        const groupsData = fs.readFileSync(groupsFile, "utf8");
        const rankingData = fs.readFileSync(rankingFile, "utf8");
        const usersData = fs.readFileSync(usersFile, "utf8");

        const groups = JSON.parse(groupsData);
        const ranking = JSON.parse(rankingData);
        const users = JSON.parse(usersData);

        const user = users.find((u) => u.id === req.userId);
        if (!user) {
            return res.status(403).json({ message: "Пользователь не найден" });
        }
        const isAdminOrTeacher = user.role === "admin" || user.role === "teacher";

        const filteredRanking = ranking.filter((team) => groups.includes(team.group));

        if (filteredRanking.length !== ranking.length) {
            fs.writeFileSync(rankingFile, JSON.stringify(filteredRanking, null, 2), "utf8");
        }

        const result = filteredRanking.map((team) => ({
            ...team,
            canEdit: isAdminOrTeacher,
        }));

        res.status(200).json(result);
    } catch (error) {
        console.error("Ошибка чтения данных рейтинга:", error);
        res.status(500).json({ message: "Ошибка чтения данных рейтинга" });
    }
});

rankingRouter.post("/", checkUserRole, (req, res) => {
    const { group, points } = req.body;
    try {
        const groupsData = fs.readFileSync(groupsFile, "utf8");
        const groups = JSON.parse(groupsData);
        if (!group || points === undefined) {
            return res.status(400).json({ message: "Название группы и баллы обязательны!" });
        }
        if (!groups.includes(group)) {
            return res.status(400).json({ message: "Такой группы не существует!" });
        }
        const rankingData = fs.readFileSync(rankingFile, "utf8");
        const ranking = JSON.parse(rankingData);
        const existingTeam = ranking.find((team) => team.group === group);
        if (existingTeam) {
            return res.status(400).json({ message: "Команда для этой группы уже существует!" });
        }
        const newTeam = { id: uuidv4(), group, points };
        ranking.push(newTeam);
        fs.writeFileSync(rankingFile, JSON.stringify(ranking, null, 2), "utf8");
        res.status(201).json({ message: "Команда добавлена", team: newTeam });
    } catch (error) {
        console.error("Ошибка при добавлении команды:", error);
        res.status(500).json({ message: "Ошибка при добавлении команды" });
    }
});


rankingRouter.put("/:id", checkUserRole, (req, res) => {
    const { id } = req.params;
    const { points } = req.body;
    try {
        const rankingData = fs.readFileSync(rankingFile, "utf8");
        const ranking = JSON.parse(rankingData);

        const teamIndex = ranking.findIndex((team) => team.id === id);
        if (teamIndex === -1) {
            return res.status(404).json({ message: "Команда не найдена" });
        }
        ranking[teamIndex].points = points;
        fs.writeFileSync(rankingFile, JSON.stringify(ranking, null, 2), "utf8");

        res.status(200).json({ message: "Баллы обновлены", team: ranking[teamIndex] });
    } catch (error) {
        console.error("Ошибка при обновлении баллов:", error);
        res.status(500).json({ message: "Ошибка при обновлении баллов" });
    }
});

rankingRouter.delete("/:id", checkUserRole, (req, res) => {
    const { id } = req.params;
    try {
        const rankingData = fs.readFileSync(rankingFile, "utf8");
        let ranking = JSON.parse(rankingData);

        ranking = ranking.filter((team) => team.id !== id);
        fs.writeFileSync(rankingFile, JSON.stringify(ranking, null, 2), "utf8");

        res.status(200).json({ message: "Команда удалена" });
    } catch (error) {
        console.error("Ошибка при удалении команды:", error);
        res.status(500).json({ message: "Ошибка при удалении команды" });
    }
});

rankingRouter.get("/groups", (req, res) => {
    try {
        const groupsData = fs.readFileSync(groupsFile, "utf8");
        const groups = JSON.parse(groupsData);
        res.json(groups);
    } catch (error) {
        console.error("Ошибка загрузки списка групп:", error);
        res.status(500).json({ message: "Ошибка сервера при загрузке групп" });
    }
});

module.exports = rankingRouter;
