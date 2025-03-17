const express = require("express");
const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");
const multer = require("multer");
const courseSectionsRouter = express.Router();
const { authenticateToken, authorizeRole } = require("./middleware");
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "course_content");

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const sectionPath = path.join(UPLOADS_DIR, `section-${req.body.sectionId}`);
        if (!fs.existsSync(sectionPath)) {
            fs.mkdirSync(sectionPath, { recursive: true });
        }
        cb(null, sectionPath);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

courseSectionsRouter.get("/view", authenticateToken, async (req, res) => {
    const courseId = req.params.id || req.baseUrl.split('/')[2];
    try {
        const result = await pool.query(
            "SELECT * FROM course_sections WHERE course_id = $1 AND visible = true ORDER BY section_order",
            [courseId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Ошибка получения разделов:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

courseSectionsRouter.get("/", authenticateToken, async (req, res) => {
    const courseId = req.params.id || req.baseUrl.split('/')[2];
    try {
        const result = await pool.query(
            "SELECT * FROM course_sections WHERE course_id = $1 ORDER BY section_order",
            [courseId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Ошибка получения разделов:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

courseSectionsRouter.get("/:sectionId", authenticateToken, async (req, res) => {
    const { sectionId } = req.params;
    try {
        const result = await pool.query(
            "SELECT * FROM course_sections WHERE id = $1",
            [sectionId]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: "Раздел не найден" });
        const section = result.rows[0];
        const absoluteFilePath = path.join(process.cwd(), section.file_path);

        if (!fs.existsSync(absoluteFilePath)) {
            return res.status(404).json({ error: "Файл с контентом не найден" });
        }
        const content_md = fs.readFileSync(absoluteFilePath, "utf8");
        const attachmentsResult = await pool.query('SELECT * FROM section_attachments WHERE section_id = $1', [sectionId]);
        res.json({ ...section, content_md, attachments: attachmentsResult.rows });
    } catch (error) {
        console.error("Ошибка получения содержимого раздела:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

courseSectionsRouter.post("/", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const courseId = req.params.id || req.baseUrl.split('/')[2];
    const { section_title, content_md, section_description } = req.body;
    try {
        const folderPath = path.join(process.cwd(), "course_content", courseId);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
        const fileName = `section-${Date.now()}.md`;
        const filePath = path.join(folderPath, fileName);
        fs.writeFileSync(filePath, content_md, "utf8");
        const relativePath = `/course_content/${courseId}/${fileName}`;
        const result = await pool.query(
            `INSERT INTO course_sections (course_id, section_title, file_path, section_order, section_description) 
             VALUES ($1, $2, $3, (SELECT COALESCE(MAX(section_order), 0) + 1 FROM course_sections WHERE course_id = $1), $4) 
             RETURNING *`,
            [courseId, section_title, relativePath, section_description]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Ошибка создания раздела:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

courseSectionsRouter.put("/content", authenticateToken, authorizeRole(["admin", "mentor"]), upload.array("files"), async (req, res) => {
    const { courseId, sectionId, content_md } = req.body;
    if (!sectionId) {
        return res.status(400).json({ error: "Отсутствует sectionId" });
    }
    try {
        const result = await pool.query("SELECT file_path FROM course_sections WHERE id = $1", [sectionId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Раздел не найден" });
        }
        const mdFilePath = path.join(process.cwd(), result.rows[0].file_path);
        if (content_md) {
            fs.writeFileSync(mdFilePath, content_md, "utf8");
        }
        if (req.files && req.files.length > 0) {
            const attachments = req.files.map((file) => ({
                filename: file.originalname,
                file_path: `/uploads/course_content/section-${sectionId}/${file.originalname}`,
            }));
            for (const attachment of attachments) {
                const existingFile = await pool.query(
                    "SELECT id FROM section_attachments WHERE course_id = $1 AND section_id = $2 AND filename = $3",
                    [courseId, sectionId, attachment.filename]
                );
                if (existingFile.rowCount === 0) {
                    await pool.query(
                        "INSERT INTO section_attachments (course_id, section_id, filename, file_path) VALUES ($1, $2, $3, $4)",
                        [courseId, sectionId, attachment.filename, attachment.file_path]
                    );
                } else {
                    console.log(`Файл "${attachment.filename}" уже существует в базе.`);
                }
            }
        }

        res.json({ message: "Markdown файл и вложения обновлены" });
    } catch (error) {
        console.error("Ошибка обновления файла:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

courseSectionsRouter.put("/reorder", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { sections } = req.body;
    if (!Array.isArray(sections) || sections.length === 0) {
        return res.status(400).json({ error: "Некорректные данные для обновления" });
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        for (const { id, order } of sections) {
            if (!Number.isInteger(id) || !Number.isInteger(order)) {
                throw new Error(`Некорректные данные: id=${id}, order=${order}`);
            }
            await client.query(
                "UPDATE course_sections SET section_order = $1 WHERE id = $2",
                [order, id]
            );
        }
        await client.query("COMMIT");
        res.json({ message: "Порядок разделов обновлён" });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Ошибка изменения порядка разделов:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    } finally {
        client.release();
    }
});

courseSectionsRouter.put("/:sectionId", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { sectionId } = req.params;
    const { section_title, section_description, content_md } = req.body;
    try {
        const result = await pool.query(
            "SELECT * FROM course_sections WHERE id = $1",
            [sectionId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Раздел не найден" });
        }
        const section = result.rows[0];
        const absoluteFilePath = path.join(process.cwd(), section.file_path);
        if (typeof content_md === "string") {
            if (!fs.existsSync(absoluteFilePath)) {
                return res.status(404).json({ error: "Файл с контентом не найден" });
            }
            fs.writeFileSync(absoluteFilePath, content_md, "utf8");
        }
        if (section_title) {
            await pool.query(
                "UPDATE course_sections SET section_title = $1 WHERE id = $2",
                [section_title, sectionId]
            );
        }
        if (section_description) {
            await pool.query(
                "UPDATE course_sections SET section_description = $1 WHERE id = $2",
                [section_description, sectionId]
            );
        }
        res.json({ message: "Раздел обновлён" });
    } catch (error) {
        console.error("Ошибка обновления раздела:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

courseSectionsRouter.delete("/:sectionId/attachments/:fileId", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { sectionId, fileId } = req.params;
    try {
        const result = await pool.query(
            "SELECT file_path FROM section_attachments WHERE section_id = $1 AND id = $2",
            [sectionId, fileId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Файл не найден" });
        }
        const { file_path } = result.rows[0];
        const absoluteFilePath = path.join(process.cwd(), file_path);
        if (fs.existsSync(absoluteFilePath)) {
            fs.unlinkSync(absoluteFilePath);
        }
        await pool.query(
            "DELETE FROM section_attachments WHERE section_id = $1 AND id = $2",
            [sectionId, fileId]
        );
        res.json({ message: "Файл удалён" });
    } catch (error) {
        console.error("Ошибка удаления файла:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});
courseSectionsRouter.delete("/:sectionId", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { sectionId } = req.params;
    try {
        const attachments = await pool.query(
            "SELECT file_path FROM section_attachments WHERE section_id = $1",
            [sectionId]
        );
        for (const file of attachments.rows) {
            const absoluteFilePath = path.join(process.cwd(), file.file_path);
            if (fs.existsSync(absoluteFilePath)) {
                fs.unlinkSync(absoluteFilePath);
            }
        }
        await pool.query("DELETE FROM section_attachments WHERE section_id = $1", [sectionId]);
        const result = await pool.query(
            "SELECT file_path FROM course_sections WHERE id = $1",
            [sectionId]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: "Раздел не найден" });
        const { file_path } = result.rows[0];
        const absoluteFilePath = path.join(process.cwd(), file_path);
        if (fs.existsSync(absoluteFilePath)) {
            fs.unlinkSync(absoluteFilePath);
        }
        await pool.query("DELETE FROM course_sections WHERE id = $1", [sectionId]);
        res.json({ message: "Раздел удалён" });
    } catch (error) {
        console.error("Ошибка удаления раздела:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

courseSectionsRouter.put("/visibility/:id", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { id } = req.params;
    const { visible } = req.body;
    try {
        const result = await pool.query(
            "UPDATE course_sections SET visible = $1 WHERE id = $2 RETURNING visible",
            [visible, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Новость не найдена" });
        }
        res.json({ message: "Видимость обновлена", visible: result.rows[0].visible });
    } catch (error) {
        console.error("Ошибка изменения видимости новости:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

module.exports = courseSectionsRouter;
