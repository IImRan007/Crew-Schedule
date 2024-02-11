const mongoose = require("mongoose");

const dataFlexSchema = new mongoose.Schema(
  {
    quoteName: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Data_Flex", dataFlexSchema);
