const express = require('express');
const {authorizeRole} = require('../middleware');
const MENTrouter = express.Router();
const { authenticateToken, getUserRole } = require("../middleware");

MENTrouter.get("/checkmentor", authenticateToken, async (req, res) => {
    const role = await getUserRole(req.user.id);
    if (!role) {
        return res.status(404).json({ message: "Пользователь не найден" });
    }

    if (role !== "mentor") {
        res.json({ mentor: false });
    } else {
        res.json({ mentor: true });
    }
});

module.exports = MENTrouter;
