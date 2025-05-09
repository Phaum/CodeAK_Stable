const express = require("express");
const path = require("path");
const fs = require("fs");
const coursesRouter = express.Router();
const { authenticateToken, authorizeRole } = require("./middleware");
const { Pool } = require("pg");
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

coursesRouter.post('/', authenticateToken, authorizeRole(["admin"]), async (req, res) => {
    const { title, description, image_url } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO courses (title, description, image_url) VALUES ($1, $2, $3) RETURNING *',
            [title, description, image_url]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Ошибка создания курса:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

coursesRouter.get("/view", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const userGroupResult = await pool.query(
            "SELECT codegroup FROM users WHERE id = $1",
            [userId]
        );
        if (userGroupResult.rowCount === 0) {
            return res.status(403).json({ error: "Пользователь не привязан к группе" });
        }
        const codegroup = userGroupResult.rows[0].codegroup;
        if (codegroup === "admin" || codegroup === "mentor") {
            const allCoursesResult = await pool.query(
                "SELECT * FROM courses WHERE visible = true ORDER BY course_order"
            );
            return res.json(allCoursesResult.rows);
        }
        const teamResult = await pool.query(
            "SELECT id FROM teams WHERE team_name = $1",
            [codegroup]
        );
        if (teamResult.rowCount === 0) {
            return res.status(404).json({ error: "Группа пользователя не найдена в teams" });
        }
        const teamId = teamResult.rows[0].id;
        const coursesResult = await pool.query(
            `SELECT c.* FROM courses c
             INNER JOIN course_teams ct ON c.id = ct.course_id
             WHERE ct.team_id = $1 AND c.visible = true
             ORDER BY c.course_order`,
            [teamId]
        );
        res.json(coursesResult.rows);
    } catch (error) {
        console.error("Ошибка получения курсов:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

coursesRouter.get("/",authenticateToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM courses ORDER BY course_order");
        res.json(result.rows);
    } catch (error) {
        console.error("Ошибка получения курсов:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

coursesRouter.get('/:id',authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const courseResult = await pool.query('SELECT * FROM courses WHERE id = $1', [id]);
        if (courseResult.rowCount === 0) return res.status(404).json({ error: "Курс не найден" });

        const sectionsResult = await pool.query(
            'SELECT * FROM course_sections WHERE course_id = $1 ORDER BY section_order ASC',
            [id]
        );
        res.json({ ...courseResult.rows[0], sections: sectionsResult.rows });
    } catch (error) {
        console.error("Ошибка получения курса:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

coursesRouter.put("/reorder", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { courses } = req.body;
    if (!Array.isArray(courses) || courses.length === 0) {
        return res.status(432).json({ error: "Некорректные данные" });
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        for (const course of courses) {
            await client.query("UPDATE courses SET course_order = $1 WHERE id = $2",
                [course.course_order, course.id]
            );
        }
        await client.query("COMMIT");
        res.json({ message: "Порядок курсов обновлён!" });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Ошибка при изменении порядка курсов:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    } finally {
        client.release();
    }
});

coursesRouter.put("/:id", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { id } = req.params;
    const { title, description, image_url, visible } = req.body;
    try {
        if (!title && !description && !image_url && visible === undefined) {
            return res.status(400).json({ error: "Нет данных для обновления" });
        }
        let updateFields = [];
        let values = [];
        let index = 1;
        if (title !== undefined) {
            if (!title.trim()) {
                return res.status(400).json({ error: "Название курса (title) не может быть пустым" });
            }
            updateFields.push(`title = $${index}`);
            values.push(title);
            index++;
        }
        if (description !== undefined) {
            updateFields.push(`description = $${index}`);
            values.push(description.trim() !== "" ? description : null);
            index++;
        }
        if (image_url !== undefined) {
            updateFields.push(`image_url = $${index}`);
            values.push(image_url.trim() !== "" ? image_url : null);
            index++;
        }
        if (visible !== undefined) {
            updateFields.push(`visible = $${index}`);
            values.push(visible);
            index++;
        }
        if (updateFields.length === 0) {
            return res.status(400).json({ error: "Нет данных для обновления" });
        }
        values.push(id);
        const query = `UPDATE courses SET ${updateFields.join(", ")} WHERE id = $${index} RETURNING *`;
        const result = await pool.query(query, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Курс не найден" });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Ошибка обновления курса:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

coursesRouter.delete("/:id", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { id } = req.params;
    try {
        const sectionsResult = await pool.query(
            "SELECT file_path FROM course_sections WHERE course_id = $1",
            [id]
        );
        for (const section of sectionsResult.rows) {
            if (section.file_path) {
                const filePath = path.join(__dirname, "../course_content", section.file_path);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        }
        const deleteCourseQuery = "DELETE FROM courses WHERE id = $1 RETURNING *";
        const deletedCourse = await pool.query(deleteCourseQuery, [id]);
        if (deletedCourse.rowCount === 0) {
            return res.status(404).json({ error: "Курс не найден" });
        }
        res.json({ message: "Курс удалён!" });
    } catch (error) {
        console.error("Ошибка удаления курса:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

coursesRouter.put("/:id/visibility", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { id } = req.params;
    try {
        const updateVisibilityQuery = `UPDATE courses SET visible = NOT visible WHERE id = $1 RETURNING visible;`;
        const result = await pool.query(updateVisibilityQuery, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Курс не найден" });
        }
        const newVisibility = result.rows[0].visible;
        res.json({ message: newVisibility ? "Курс теперь виден" : "Курс скрыт", visible: newVisibility });
    } catch (error) {
        console.error("Ошибка изменения видимости курса:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

module.exports = coursesRouter;
