const express = require("express");
const multer = require("multer");
const newsRouter = express.Router();
const fs = require("fs");
const path = require("path");
const { authenticateToken, authorizeRole } = require("../middleware");
const markdownFolder = path.join(__dirname, "markdown-files");
const uploadFolder = path.join(__dirname, "uploads");
newsRouter.use("/uploads-news", express.static(uploadFolder));
const {baseBackendUrl } = require("../constants");
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `news-${Date.now()}${path.extname(file.originalname)}`);
    },
});

const upload = multer({ storage });

newsRouter.get('/view', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM news WHERE visible = true ORDER BY position');
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения новостей:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

newsRouter.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM news ORDER BY position');
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения новостей:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

newsRouter.post('/add', authenticateToken, authorizeRole(["admin", "mentor"]), upload.single('image'), async (req, res) => {
    const { title, description, date, tags } = req.body;
    try {
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
        const parsedTags = tags ? tags.replace(/^{|}$/g, '').split(',') : [];

        const folderPath = path.join(process.cwd(), "news_content");
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
        const fileName = `news-${Date.now()}.md`;
        const filePath = path.join(folderPath, fileName);
        fs.writeFileSync(filePath, '', "utf8");
        const relativePath = `/news_content/${fileName}`;
        const newNews = await pool.query(
            'INSERT INTO news (title, description, date, tags, imageurl, file_path) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [title, description, date, parsedTags, imageUrl, relativePath]
        );
        res.json(newNews.rows[0]);
    } catch (error) {
        console.error('Ошибка добавления новости:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

newsRouter.put('/edit/:id', authenticateToken, authorizeRole(["admin", "mentor"]), upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { title, description, date, tags, visible, imageUrl } = req.body;
    const newImageUrl = req.file
        ? `/uploads/${req.file.filename}`
        : imageUrl;
    try {
        const isVisible = visible === 'true' || visible === true;
        const result = await pool.query(`UPDATE news SET title = $1, description = $2, date = $3, tags = $4, imageurl = $5, visible = $6 WHERE id = $7 RETURNING *`,
            [title, description, date, tags, newImageUrl, isVisible, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка обновления новости:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

newsRouter.delete('/delete/:id', authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("SELECT file_path, imageurl FROM news WHERE id = $1", [id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "Новость не найдена" });
        const filePath = result.rows[0].file_path;
        const imageurl = result.rows[0].imageurl;
        const absolutePath = path.join(process.cwd(), filePath);
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
        }
        const absoluteImagePath = path.join(process.cwd(), imageurl);
        if (fs.existsSync(absoluteImagePath)) {
            fs.unlinkSync(absoluteImagePath);
        }
        await pool.query('DELETE FROM news WHERE id = $1', [id]);
        res.json({ message: 'Новость удалена' });
    } catch (error) {
        console.error('Ошибка удаления новости:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

newsRouter.put('/reorder', authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { reorderedNews } = req.body.reorderedNews;
    if (!Array.isArray(reorderedNews) || reorderedNews.length === 0) {
        console.error("Ошибка: Некорректные данные", req.body);
        return res.status(400).json({ error: "Некорректные данные" });
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        for (const news of reorderedNews) {
            if (!news.id || typeof news.position !== "number") {
                console.error("Ошибка: Некорректные данные курса", news);
                return res.status(400).json({ error: "Некорректные данные курса" });
            }
            await client.query(
                "UPDATE news SET position = $1 WHERE id = $2",
                [news.position, news.id]
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

newsRouter.get('/content/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "SELECT * FROM news WHERE id = $1",
            [id]
        );
        if (result.rowCount === 0) return res.status(404).json({ error: "Раздел не найден" });
        const section = result.rows[0];
        const absoluteFilePath = path.join(process.cwd(), section.file_path);
        if (!fs.existsSync(absoluteFilePath)) {
            return res.status(404).json({ error: "Файл с контентом не найден" });
        }
        const content_md = fs.readFileSync(absoluteFilePath, "utf8");
        const attachmentsResult = await pool.query('SELECT * FROM news_attachments WHERE news_id = $1', [id]);
        res.json({ ...section, content_md, attachments: attachmentsResult.rows });
    } catch (error) {
        console.error("Ошибка получения содержимого раздела:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

const attachmentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/attachments/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});
const uploadAttachments = multer({ storage: attachmentStorage }).array('attachments');
newsRouter.put('/content/:id', authenticateToken, authorizeRole(["admin", "mentor"]), uploadAttachments, async (req, res) => {
    const { id } = req.params;
    const { content_md } = req.body;
    if (!content_md) {
        return res.status(400).json({ error: "Отсутствует content_md" });
    }
    try {
        const result = await pool.query("SELECT file_path FROM news WHERE id = $1", [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Раздел не найден" });
        }
        const { file_path } = result.rows[0];
        const absoluteFilePath = path.join(process.cwd(), file_path);
        if (!fs.existsSync(absoluteFilePath)) {
            return res.status(404).json({ error: "Файл с контентом не найден" });
        }
        fs.writeFileSync(absoluteFilePath, content_md, "utf8");
        res.json({ message: "Содержимое Markdown-файла обновлено" });
        if (req.files && req.files.length > 0) {
            await Promise.all(req.files.map(file => {
                const file_url = `/uploads/attachments/${file.originalname}`;
                const file_type = file.mimetype;
                return pool.query(
                    'INSERT INTO news_attachments (news_id, filename, file_url, file_type) VALUES ($1, $2, $3, $4)',
                    [id, file.originalname, file_url, file_type]
                );
            }));
        }
    } catch (error) {
        console.error("Ошибка обновления содержимого файла:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

newsRouter.delete('/attachment/:id', authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT file_url FROM news_attachments WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Вложение не найдено" });
        }
        const fileUrl = result.rows[0].file_url;
        const filePath = path.join(process.cwd(), "uploads", "attachments", path.basename(fileUrl));
        fs.unlink(filePath, async (err) => {
            if (err) {
                console.error("Ошибка удаления файла:", err);
                return res.status(500).json({ error: "Ошибка удаления файла" });
            }
            await pool.query('DELETE FROM news_attachments WHERE id = $1', [id]);
            res.json({ message: "Вложение удалено" });
        });
    } catch (error) {
        console.error("Ошибка при удалении вложения:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

newsRouter.put("/visibility/:id", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { id } = req.params;
    const { visible } = req.body;
    try {
        const result = await pool.query(
            "UPDATE news SET visible = $1 WHERE id = $2 RETURNING visible",
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


newsRouter.use('/uploads', express.static('uploads'));
module.exports = newsRouter;
