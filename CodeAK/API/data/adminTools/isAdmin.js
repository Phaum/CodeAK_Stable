const express = require('express');
const {authorizeRole} = require('../middleware');
const ADMrouter = express.Router();
const { authenticateToken, getUserRole } = require("../middleware");

ADMrouter.get("/checkadmin", authenticateToken, async (req, res) => {
    const role = await getUserRole(req.user.id);
    if (!role) {
        return res.status(404).json({ message: "Пользователь не найден" });
    }
    if (role !== "admin") {
        res.json({ admin: false });
    } else {
        res.json({ admin: true });
    }
});

module.exports = ADMrouter;
