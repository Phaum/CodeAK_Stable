const express = require("express");
const teamsRouter = express.Router();
const { Pool } = require("pg");
const { authenticateToken, authorizeRole } = require("./middleware");
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

teamsRouter.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM teams WHERE is_individual = FALSE ORDER BY rank ASC');
        res.json(result.rows);
    } catch (error) {
        console.error("Ошибка получения данных о командах:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

teamsRouter.post('/', authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { team_name, points } = req.body;
    try {
        const rankResult = await pool.query(`
            SELECT COUNT(*) + 1 AS new_rank FROM teams WHERE is_individual = FALSE
        `);
        const newRank = rankResult.rows[0].new_rank;
        const insertResult = await pool.query(
            'INSERT INTO teams (team_name, rank, points, is_individual) VALUES ($1, $2, $3, FALSE) RETURNING *',
            [team_name, newRank, points]
        );
        await pool.query(`
            WITH ranked_teams AS (
                SELECT id, RANK() OVER (ORDER BY points DESC) AS new_rank 
                FROM teams WHERE is_individual = FALSE
            ),
            ranked_individuals AS (
                SELECT id, RANK() OVER (ORDER BY points DESC) AS new_rank 
                FROM teams WHERE is_individual = TRUE
            )
            UPDATE teams 
            SET rank = ranked.new_rank
            FROM (
                SELECT * FROM ranked_teams
                UNION ALL
                SELECT * FROM ranked_individuals
            ) AS ranked
            WHERE teams.id = ranked.id;
        `);
        res.json(insertResult.rows[0]);
    } catch (error) {
        console.error("Ошибка добавления команды:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

teamsRouter.put('/:id', authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { id } = req.params;
    const { team_name, points } = req.body;
    try {
        const updateResult = await pool.query(
            'UPDATE teams SET team_name = $1, points = $2 WHERE id = $3 RETURNING *',
            [team_name, points, id]
        );
        await pool.query(`
            WITH ranked_teams AS (
                SELECT id, RANK() OVER (ORDER BY points DESC) AS new_rank 
                FROM teams WHERE is_individual = FALSE
            ),
            ranked_individuals AS (
                SELECT id, RANK() OVER (ORDER BY points DESC) AS new_rank 
                FROM teams WHERE is_individual = TRUE
            )
            UPDATE teams 
            SET rank = ranked.new_rank
            FROM (
                SELECT * FROM ranked_teams
                UNION ALL
                SELECT * FROM ranked_individuals
            ) AS ranked
            WHERE teams.id = ranked.id;
        `);
        res.json(updateResult.rows[0]);
    } catch (error) {
        console.error("Ошибка обновления команды:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

teamsRouter.delete('/:id', authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { id } = req.params;
    try {
        const deleteResult = await pool.query('DELETE FROM teams WHERE id = $1 RETURNING *', [id]);
        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ error: "Команда не найдена" });
        }
        await pool.query(`
            WITH ranked_teams AS (
                SELECT id, RANK() OVER (ORDER BY points DESC) AS new_rank 
                FROM teams WHERE is_individual = FALSE
            ),
            ranked_individuals AS (
                SELECT id, RANK() OVER (ORDER BY points DESC) AS new_rank 
                FROM teams WHERE is_individual = TRUE
            )
            UPDATE teams 
            SET rank = ranked.new_rank
            FROM (
                SELECT * FROM ranked_teams
                UNION ALL
                SELECT * FROM ranked_individuals
            ) AS ranked
            WHERE teams.id = ranked.id;
        `);
        res.json({ message: "Команда/участник удалён" });
    } catch (error) {
        console.error("Ошибка удаления команды:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

teamsRouter.post('/from-group', authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { team_name, usergroup, points } = req.body;
    try {
        const insertResult = await pool.query(
            'INSERT INTO teams (team_name, points, wins, losses) VALUES ($1, $2, $3, $4) RETURNING *',
            [team_name, points]
        );
        const newTeam = insertResult.rows[0];
        const usersResult = await pool.query(
            'SELECT id FROM users WHERE usergroup = $1',
            [usergroup]
        );
        if (usersResult.rowCount > 0) {
            const userIds = usersResult.rows.map(row => row.id);
            const insertValues = userIds.map((userId, index) => `($1, $${index + 2})`).join(', ');
            const params = [newTeam.id, ...userIds];
            await pool.query(
                `INSERT INTO team_members (team_id, user_id) VALUES ${insertValues}`,
                params
            );
        }
        await pool.query(`WITH ranked AS (SELECT id, RANK() OVER (ORDER BY points DESC) AS new_rank FROM teams) UPDATE teams SET rank = ranked.new_rank FROM ranked WHERE teams.id = ranked.id;`);
        res.json({
            team: newTeam,
            members: usersResult.rows
        });
    } catch (error) {
        console.error("Ошибка создания команды из группы:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

teamsRouter.post("/individual", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { team_name, points } = req.body;
    if (!team_name) {
        return res.status(400).json({ error: "Имя участника обязательно" });
    }
    try {
        const rankResult = await pool.query(`
            SELECT COUNT(*) + 1 AS new_rank FROM teams WHERE is_individual = TRUE
        `);
        const newRank = rankResult.rows[0].new_rank;
        const result = await pool.query(
            "INSERT INTO teams (rank, team_name, points, is_individual) VALUES ($1, $2, $3, TRUE) RETURNING *",
            [newRank, team_name, points || 0]
        );
        await pool.query("UPDATE users SET codegroup = $1 WHERE login = $2;",
            [team_name, team_name]
        );
        await pool.query(`
            WITH ranked_individuals AS (
                SELECT id, RANK() OVER (ORDER BY points DESC) AS new_rank
                FROM teams WHERE is_individual = TRUE
            )
            UPDATE teams
            SET rank = ranked_individuals.new_rank
                FROM ranked_individuals
            WHERE teams.id = ranked_individuals.id;
        `);

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Ошибка добавления участника:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

teamsRouter.get("/individuals", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM teams WHERE is_individual = TRUE ORDER BY rank ASC"
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Ошибка получения списка участников:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

teamsRouter.put("/individual/:id", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { id } = req.params;
    const { team_name, points } = req.body;
    try {
        const result = await pool.query(
            "UPDATE teams SET team_name = $1, points = $2 WHERE id = $3 AND is_individual = TRUE RETURNING *",
            [team_name, points, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Участник не найден" });
        }
        await pool.query(`
            WITH ranked_individuals AS (
                SELECT id, RANK() OVER (ORDER BY points DESC) AS new_rank 
                FROM teams WHERE is_individual = TRUE
            )
            UPDATE teams 
            SET rank = ranked_individuals.new_rank
            FROM ranked_individuals
            WHERE teams.id = ranked_individuals.id;
        `);
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Ошибка обновления участника:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

teamsRouter.delete("/individual/:id", authenticateToken, authorizeRole(["admin", "mentor"]), async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "DELETE FROM teams WHERE id = $1 AND is_individual = TRUE RETURNING *",
            [id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Участник не найден" });
        }
        await pool.query(`
            WITH ranked_individuals AS (
                SELECT id, RANK() OVER (ORDER BY points DESC) AS new_rank 
                FROM teams WHERE is_individual = TRUE
            )
            UPDATE teams 
            SET rank = ranked_individuals.new_rank
            FROM ranked_individuals
            WHERE teams.id = ranked_individuals.id;
        `);
        res.json({ message: "Участник удалён" });
    } catch (error) {
        console.error("Ошибка удаления участника:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

module.exports = teamsRouter;
