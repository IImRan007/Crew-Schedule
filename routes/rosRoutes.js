const express = require("express");
const router = express.Router();
const {
  createRos,
  getAllRos,
  getSingleRos,
  updateRos,
  searchRos,
  deleteRos,
  listAllRos,
} = require("../controllers/rosController");

router.post("/", createRos);
router.get("/all", getAllRos);
router.get("/list-all", listAllRos);
router.get("/search", searchRos);
router.route("/:id").get(getSingleRos).put(updateRos).delete(deleteRos);

module.exports = router;
