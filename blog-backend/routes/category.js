const express = require("express");
const { create, getAll, getById, update, deleteCategory } = require('../controllers/categoryController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get("/category", getAll);
router.get("/category/:id", getById);
router.post("/category", requireAdmin, create);
router.put("/category/:id", requireAdmin, update);
router.delete("/category/:id", requireAdmin, deleteCategory);

module.exports = router;