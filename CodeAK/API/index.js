require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { logger } = require("./logger");
const PORT = process.env.PORT || 5000;
const authRouter = require('./data/auth');
const adminRouter = require("./data/adminTools/adminTools");
const newsRouter = require("./data/news/news");
const rankingRouter = require("./data/ranking/ranking");
const adminRoutes = require("./data/adminTools/isAdmin");
const mentorRoutes = require("./data/adminTools/isMentor");
const profileRoutes = require('./data/profile');
const teamsRouter = require('./data/teams');
const contactsRouter  = require('./data/contacts');
const dashboardRouter = require('./data/dashboard');
const coursesRouter = require('./data/courses');
const courseSectionsRouter = require('./data/courseSections');
const teamCoursesRouter = require('./data/team-courses');
const logsRouter = require('./data/logs');
const reportsRouter = require('./data/reportsRouter');
const path = require("path");

const app = express();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    logger.info(`Запрос: ${req.method} ${req.originalUrl} | IP: ${req.ip}`);
    next();
});

app.use("/auth", authRouter);
app.use("/admin-tools", adminRouter);
app.use("/isadmin", adminRoutes);
app.use("/ismentor", mentorRoutes);
app.use("/news", newsRouter);
app.use("/ranking", rankingRouter);
app.use("/user", profileRoutes);
app.use("/teams", teamsRouter);
app.use("/contacts", contactsRouter);
app.use("/dashboard", dashboardRouter);
app.use('/courses', coursesRouter);
app.use('/courses/:id/sections', courseSectionsRouter);
app.use('/team-courses', teamCoursesRouter);
app.use('/logs', logsRouter);
app.use('/reports', reportsRouter);

app.use((req, res) => {
    logger.warn(`Маршрут не найден: ${req.originalUrl}`);
    res.status(404).json({ message: "Маршрут не найден" });
});

app.listen(PORT, () => {
    logger.info(`Сервер запущен на порте:${PORT}`);
    console.log(`Сервер запущен на порте:${PORT}`);
});