const express = require("express");
const router = express.Router();
const {
  createCrewRef,
  getAllCrewRef,
  getSingleCrewRef,
  updateCrewRef,
  searchCrewRef,
  deleteCrewRef,
  listAllCrewRef,
} = require("../controllers/crewRefController");

router.post("/", createCrewRef);
router.get("/all", getAllCrewRef);
router.get("/search", searchCrewRef);
router.get("/listall", listAllCrewRef);
router
  .route("/:id")
  .get(getSingleCrewRef)
  .put(updateCrewRef)
  .delete(deleteCrewRef);

module.exports = router;
