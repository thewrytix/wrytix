const express = require("express");
const CategoryController = require("../controllers/categoryController");

const router = express.Router();

router.get("/category", CategoryController.getAll);
router.get("/category/:id", CategoryController.getById);
router.post("/category/", CategoryController.create);
router.put("/category/:id", CategoryController.update);
router.delete("/category/:id", CategoryController.remove);

module.exports = router;
