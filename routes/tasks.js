const express = require("express");
const {
    getTasks,
    addTask,
    toggleTask,
    deleteTask
} = require("../controllers/taskController");

const router = express.Router();

const auth = require("../middleware/auth");

router.route("/")
    .get(auth, getTasks)
    .post(auth, addTask);

router.route("/:id/toggle")
    .put(auth, toggleTask);

router.route("/:id")
    .delete(auth, deleteTask);

module.exports = router;
