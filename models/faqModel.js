const mongoose = require("mongoose");

const faqSchena = new mongoose.Schema(
  {
    itemDetail: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Faq", faqSchena);
