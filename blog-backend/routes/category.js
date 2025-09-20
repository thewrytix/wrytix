const express = require("express");
const { create, getAll, getById, update, deleteCategory} = require('../controllers/categoryController');

const router = express.Router();

router.get("/category", getAll);
router.get("/category/:id", getById);
router.post("/category", create);
router.put("/category/:id", update);
router.delete("/category/:id", deleteCategory);

module.exports = router;
