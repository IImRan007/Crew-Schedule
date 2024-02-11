const mongoose = require("mongoose");

const rosSchema = new mongoose.Schema(
  {
    startDate: {
      type: String,
    },
    endDate: {
      type: String,
    },
    time: {
      type: String,
    },
    eventYear: {
      type: String,
    },
    show: {
      type: String,
    },
    itemDetail: {
      type: String,
    },
    notes: {
      type: String,
    },
    status: {
      type: String,
      default: "PLANNED",
    },
    actionType: {
      type: String,
      default: "CREW/SCHEDULE",
    },
    assignedTo: {
      type: String,
    },
    fromLocation: {
      type: String,
    },
    toLocation: {
      type: String,
    },
    originAddress: {
      type: String,
    },
    destinationAddress: {
      type: String,
    },
    ref: {
      type: String,
    },
    bookedBy: {
      type: String,
    },
    pmtType: {
      type: String,
    },
    plannedAmount: {
      type: String,
    },
    finalAmountPaid: {
      type: String,
    },
    requiresConfirmation: {
      type: String,
    },
    confirmed: {
      type: String,
    },
    refundable: {
      type: String,
    },
    semiEarliest: {
      type: String,
    },
    semiDrop: {
      type: String,
    },
    semiPickup: {
      type: String,
    },
    semiDriver: {
      type: String,
    },
    semiCarrier: {
      type: String,
    },
    semiDelivery: {
      type: String,
    },
    semiStatus: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Ros", rosSchema);
