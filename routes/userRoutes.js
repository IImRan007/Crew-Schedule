const express = require("express");
const router = express.Router();
const {
  loginUser,
  getMe,
  registeruser,
  listAllusers,
  updateUser,
  deleteUser,
} = require("../controllers/userController");

router.post("/login", loginUser);
router.post("/register", registeruser);
router.get("/all", listAllusers);
router.get("/me/:id", getMe);
router.route("/:id").put(updateUser).delete(deleteUser);

module.exports = router;
