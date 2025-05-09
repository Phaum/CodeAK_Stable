const express = require("express");
const {Pool} = require("pg");
const teamCoursesRouter = express.Router();
const { authenticateToken, authorizeRole } = require("./middleware");

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

teamCoursesRouter.get("/teams/all", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT id, team_name FROM teams ORDER BY team_name");
        res.json(result.rows);
    } catch (error) {
        console.error("Ошибка получения списка команд:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

teamCoursesRouter.get("/:courseId/teams", authenticateToken, async (req, res) => {
    const { courseId } = req.params;
    try {
        const result = await pool.query(
            "SELECT t.id, t.team_name FROM teams t INNER JOIN course_teams ct ON t.id = ct.team_id WHERE ct.course_id = $1",
            [courseId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Ошибка получения команд курса:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

teamCoursesRouter.put("/:courseId/teams", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { courseId } = req.params;
    const { teamIds } = req.body;
    if (!Array.isArray(teamIds)) {
        return res.status(400).json({ error: "Некорректный формат данных" });
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("DELETE FROM course_teams WHERE course_id = $1", [courseId]);
        for (const teamId of teamIds) {
            await client.query(
                "INSERT INTO course_teams (course_id, team_id) VALUES ($1, $2)",
                [courseId, teamId]
            );
        }
        await client.query("COMMIT");
        res.json({ message: "Список команд обновлён!" });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Ошибка обновления команд курса:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    } finally {
        client.release();
    }
});


module.exports = teamCoursesRouter;
