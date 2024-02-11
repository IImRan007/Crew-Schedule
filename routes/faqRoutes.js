const express = require("express");
const router = express.Router();
const {
  createFaq,
  getAllfaq,
  getSingleFaq,
  updatefaq,
  searchFaq,
  deleteFaq,
  listAllfaq,
} = require("../controllers/faqController");

router.post("/", createFaq);
router.get("/all", getAllfaq);
router.get("/search", searchFaq);
router.get("/listall", listAllfaq);
router.route("/:id").get(getSingleFaq).put(updatefaq).delete(deleteFaq);

module.exports = router;
