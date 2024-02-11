const express = require("express");
const router = express.Router();
const {
  createDataFlex,
  getAllDataFlex,
  getSingleDataFlex,
  updateDataFlex,
  searchDataFlex,
  deleteDataFlex,
  fetchFlexRefSheet,
  getCrewRefSheetData,
  getFaqSheetData,
  listAllDataFlex,
  getNickNameWithTierLevel,
  getSingleCrewRefController,
  getSingleShowRefController,
  getTierLevelController,
  getFinanceRefSheetData,
  getNickNameAndPay,
} = require("../controllers/dataFlexController");

router.post("/", createDataFlex);
router.get("/all", getAllDataFlex);
router.get("/search", searchDataFlex);
router.get("/fetch", fetchFlexRefSheet);
router.get("/listall", listAllDataFlex);
router.get("/crewref", getCrewRefSheetData);
router.get("/faqsheet", getFaqSheetData);
router.get("/singlecrewref", getSingleCrewRefController);
router.get("/singleshowref", getSingleShowRefController);
router.get("/tierlevel", getTierLevelController);
router.get("/nick-tier", getNickNameWithTierLevel);
router.get("/finance", getFinanceRefSheetData);
router.get("/nick-pay", getNickNameAndPay);

router
  .route("/:id")
  .get(getSingleDataFlex)
  .put(updateDataFlex)
  .delete(deleteDataFlex);

module.exports = router;
