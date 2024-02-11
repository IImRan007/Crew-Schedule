const asyncHandler = require("express-async-handler");
const { google } = require("googleapis");
const { JWT } = require("google-auth-library");
const credentials = require("../key.json");
const cloudinary = require("cloudinary").v2;
// const moment = require("moment");
const { isValidObjectId } = require("mongoose");

const Ros = require("../models/rosModel");

// Create a JWT client
const client = new JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// @DESC POST /api/ros
const createRos = asyncHandler(async (req, res) => {
  req.setTimeout(500000);
  const data = req?.body;

  const ros = await Ros.create(data);

  if (!ros) {
    res.status(400);
    throw new Error("Error while creating ros.");
  }

  await writeDataToSheet(ros);

  res.status(201).json({ ros, success: true });
});

// @DESC GET /api/ros/all
const getAllRos = asyncHandler(async (req, res) => {
  // const page = parseInt(req?.query?.page) || 1;
  // const limit = 10;
  // const skip = (page - 1) * limit;

  // const ros = await Ros.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
  const ros = await Ros.find().sort({ createdAt: -1 });

  // const rosCount = await Ros.countDocuments();

  if (!ros || ros.length === 0) {
    res.status(400);
    throw new Error("No Ros Found!");
  }

  res.status(200).json({
    ros: ros,
    success: true,
    // rosCount: rosCount,
  });
});

const listAllRos = asyncHandler(async (req, res) => {
  const ros = await Ros.find().sort({ createdAt: -1 });

  if (!ros || ros.length === 0) {
    res.status(400);
    throw new Error("No Ros Found!");
  }

  res.status(200).json({
    ros: ros,
    success: true,
  });
});

// @desc Get single ros details
// @route GET /api/ros/:id
const getSingleRos = asyncHandler(async (req, res) => {
  const ros = await Ros.findById(req.params.id);

  if (!ros) {
    res.status(404);
    throw new Error("Ros not found");
  }

  res.status(200).json({ ros, success: true });
});

// @DESC PUT /api/ros/:id
const updateRos = asyncHandler(async (req, res) => {
  const rosId = req?.params?.id;

  if (!rosId) {
    res.status(400);
    throw new Error("Please provide the ros Id.");
  }

  const ros = await Ros.findById(rosId);

  if (!ros) {
    res.status(404);
    throw new Error("Ros not found");
  }

  let data = req.body;

  const updatedRos = await Ros.findByIdAndUpdate(rosId, data, {
    new: true,
  });

  if (!updatedRos) {
    res.status(400);
    throw new Error("Error while creating ros.");
  }

  // await updateRosSheetData(updatedRos);
  await deleteSheetData(rosId);
  await writeDataToSheet(updatedRos);

  res.status(200).json({ ros: updatedRos, success: true });
});

// Search
const searchRos = asyncHandler(async (req, res) => {
  const query = req.query.query;
  // const page = parseInt(req?.query?.page) || 1;
  // const limit = 10;

  // const skip = (page - 1) * limit;

  let results;

  // Check if query parameter is of _id type
  if (isValidObjectId(query)) {
    // If it's _id type, use findById and wrap the result in an array
    const result = await Ros.findById(query);
    results = result ? [result] : [];
  } else {
    // Otherwise, perform a regular search
    results = await Ros.find({
      $or: [
        { show: { $regex: query, $options: "i" } },
        { assignedTo: { $regex: query, $options: "i" } },
      ],
    });
    // .skip(skip)
    // .limit(limit);
  }

  if (!results || results.length === 0) {
    res.status(404);
    throw new Error("No ros found!");
  }

  res.status(200).json({ ros: results, success: true });
});

// Write Data in Sheet
// const writeDataToSheet = async (data) => {
//   try {
//     await client.authorize();
//     const sheetsApi = google.sheets({ version: "v4", auth: client });

//     const spreadsheetId = process.env.SHEET_ID;
//     const sheetName = "LIVE-ROS-DATABASE";
//     // const createdDate = new Date(data.createdAt).toISOString().slice(0, 10);

//     const filteredData = {
//       _id: data._id.toString(),
//       startDate: data.startDate,
//       time: "",
//       eventYear: data.eventYear,
//       show: data.show,
//       itemDetail: data.itemDetail,
//       notes: data.notes,
//       status: data.status,
//       actionType: data.actionType,
//       assignedTo: data.assignedTo,
//       fromLocation: data.fromLocation,
//       toLocation: data.toLocation,
//     };

//     const range = `${sheetName}`;

//     const startDate = new Date(data.startDate);
//     const endDate = new Date(data.endDate);

//     const daysDifference = dateDiffInDays(startDate, endDate);

//     console.log(daysDifference);
//     for (let i = 0; i <= daysDifference; i++) {
//       // Update the startDate for each iteration
//       const currentStartDate = new Date(startDate);
//       currentStartDate.setDate(currentStartDate.getDate() + i);

//       const formattedStartDate =
//         (currentStartDate.getMonth() + 1).toString().padStart(2, "0") +
//         "/" +
//         currentStartDate.getDate().toString().padStart(2, "0") +
//         "/" +
//         currentStartDate.getFullYear();

//       const filteredDataWithUpdatedStartDate = {
//         ...filteredData,
//         startDate: formattedStartDate,
//       };

//       const request = {
//         spreadsheetId,
//         range,
//         valueInputOption: "RAW",
//         insertDataOption: "INSERT_ROWS",
//         resource: {
//           values: [Object.values(filteredDataWithUpdatedStartDate)],
//         },
//       };

//       const response = await sheetsApi.spreadsheets.values.append(request);
//       console.log("Data written to Google Sheets:", response.data);
//     }
//   } catch (error) {
//     console.error("Error writing to Google Sheets:", error);
//   }
// };

const writeDataToSheet = async (data) => {
  try {
    await client.authorize();
    const sheetsApi = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "LIVE-ROS-DATABASE";
    // const sheetName = "Copy of LIVE-ROS-DATABASE";

    const range = `${sheetName}`;

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const daysDifference = dateDiffInDays(startDate, endDate);

    const batchedData = [];

    for (let i = 0; i <= daysDifference; i++) {
      // Update the startDate for each iteration
      const currentStartDate = new Date(startDate);
      currentStartDate.setDate(currentStartDate.getDate() + i);

      const formattedStartDate =
        (currentStartDate.getMonth() + 1).toString().padStart(2, "0") +
        "/" +
        currentStartDate.getDate().toString().padStart(2, "0") +
        "/" +
        currentStartDate.getFullYear();

      const filteredDataWithUpdatedStartDate = {
        _id: data._id.toString(),
        startDate: formattedStartDate,
        time: "",
        eventYear: Number(data.eventYear),
        show: data.show,
        itemDetail: data.itemDetail,
        notes: data.notes,
        status: data.status,
        actionType: data.actionType,
        assignedTo: data.assignedTo,
        fromLocation: data.fromLocation,
        toLocation: data.toLocation,
      };

      batchedData.push(Object.values(filteredDataWithUpdatedStartDate));
    }

    console.log({ batchedData });
    // Split batched data into chunks
    const chunkSize = 1000; // Adjust chunk size as needed
    for (let i = 0; i < batchedData.length; i += chunkSize) {
      const chunk = batchedData.slice(i, i + chunkSize);

      const request = {
        spreadsheetId,
        range,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        resource: {
          values: chunk,
        },
      };

      const response = await sheetsApi.spreadsheets.values.append(request);
      console.log("Data written to Google Sheets:", response.data);
    }
  } catch (error) {
    console.error("Error writing to Google Sheets:", error);
  }
};

function dateDiffInDays(a, b) {
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;
  // Discard the time and time-zone information.
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

// Update Ros Details in Sheet
const updateRosSheetData = async (data) => {
  try {
    await client.authorize();
    const sheetsApi = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "LIVE-ROS-DATABASE";

    const filteredData = {
      startDate: data.startDate,
      endDate: data.endDate,
      eventYear: data.eventYear,
      show: data.show,
      itemDetail: data.itemDetail,
      notes: data.notes,
      status: data.status,
      actionType: data.actionType,
      assignedTo: data.assignedTo,
      fromLocation: data.fromLocation,
      toLocation: data.toLocation,
    };

    const range = `${sheetName}!A:L`;

    // Find all rows with the specified _id
    const findRequest = {
      spreadsheetId,
      range,
      valueRenderOption: "FORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    };

    const findResponse = await sheetsApi.spreadsheets.values.get(findRequest);

    const values = findResponse.data.values;
    const columnIndex = values[0].indexOf("ID");
    const matchingRows = values
      .map((row, index) => ({ index, id: row[columnIndex] }))
      .filter((entry) => entry.id == data._id.toString());

    if (matchingRows.length === 0) {
      console.error("No rows found with _id:", data._id);
      return;
    }

    // Update every matching row with the new data
    for (const matchingRow of matchingRows) {
      const updateRequest = {
        spreadsheetId,
        range: `${sheetName}!B${matchingRow.index + 1}:L${
          matchingRow.index + 1
        }`, // Assuming 1-based indexing
        valueInputOption: "RAW",
        resource: {
          values: [Object.values(filteredData)],
        },
      };

      const updateResponse = await sheetsApi.spreadsheets.values.update(
        updateRequest
      );
      console.log("Data updated in Google Sheets:", updateResponse.data);
    }
  } catch (error) {
    console.error("Error updating data in Google Sheets:", error);
  }
};

const deleteRos = asyncHandler(async (req, res) => {
  const id = req?.params?.id;

  if (!id) {
    res.status(400);
    throw new Error("Please provide the ros Id.");
  }

  const ros = await Ros.findById(id);

  if (!ros) {
    res.status(404);
    throw new Error("Ros not found!");
  }

  await Ros.deleteOne({ _id: req?.params?.id });

  await deleteSheetData(id);

  res.status(200).json({ success: true });
});

// const deleteAllRos = asyncHandler(async (req, res) => {
//   try {
//     const deleteResult = await Ros.deleteMany({});

//     await deleteAllDataExceptFirstRow();

//     res.status(200).json({
//       success: true,
//       message: `Deleted ${deleteResult.deletedCount} ros.`,
//     });
//   } catch (error) {
//     console.error("Error deleting ros:", error);
//     res.status(500).json({ success: false, error: "Internal Server Error" });
//   }
// });

const deleteSheetData = async (_id) => {
  try {
    await client.authorize();
    const sheetsApi = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "LIVE-ROS-DATABASE";

    // Retrieve the sheet properties to get the sheetId
    const sheetPropertiesRequest = await sheetsApi.spreadsheets.get({
      spreadsheetId,
    });

    const sheetProperties = sheetPropertiesRequest.data.sheets;
    const sheet = sheetProperties.find((s) => s.properties.title === sheetName);

    if (!sheet) {
      console.log(`Sheet with name ${sheetName} not found.`);
      return;
    }

    const sheetId = sheet.properties.sheetId;

    // Retrieve all values from the sheet
    const getValuesRequest = {
      spreadsheetId,
      range: `${sheetName}!A:L`, // Assuming A:Z covers all columns
    };

    const getValuesResponse = await sheetsApi.spreadsheets.values.get(
      getValuesRequest
    );
    const values = getValuesResponse.data.values;

    if (!values || values.length === 0) {
      console.log(`No data found in ${sheetName}.`);
      return;
    }

    // Find rows matching the _id and delete them
    const requests = [];
    for (let i = values.length - 1; i >= 0; i--) {
      if (values[i][0] === _id) {
        requests.push({
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: "ROWS",
              startIndex: i,
              endIndex: i + 1,
            },
          },
        });
      }
    }

    if (requests.length === 0) {
      console.log(`No matching rows found for _id: ${_id}`);
      return;
    }

    const batchUpdateRequest = {
      spreadsheetId,
      resource: {
        requests,
      },
    };

    await sheetsApi.spreadsheets.batchUpdate(batchUpdateRequest);
    console.log(`Rows with _id ${_id} deleted from Google Sheets`);
  } catch (error) {
    console.error("Error deleting rows from Google Sheets:", error);
  }
};

const deleteAllDataExceptFirstRow = async () => {
  try {
    await client.authorize();
    const sheetsApi = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "Ros";

    const sheetPropertiesRequest = await sheetsApi.spreadsheets.get({
      spreadsheetId,
    });

    const sheetProperties = sheetPropertiesRequest.data.sheets;
    const sheet = sheetProperties.find((s) => s.properties.title === sheetName);

    if (!sheet) {
      console.log(`Sheet with name ${sheetName} not found.`);
      return;
    }

    const sheetId = sheet.properties.sheetId;

    // Get the current data range in the sheet
    const currentDataRange = await sheetsApi.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`, // Assuming Z is the last column
    });

    const rowCount = currentDataRange.data.values.length;

    if (rowCount <= 1) {
      console.log("No data to delete.");
      return;
    }

    const deleteRequest = {
      spreadsheetId,
      resource: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: 1, // Start from the second row
                endIndex: rowCount + 1, // End before the last row
              },
            },
          },
        ],
      },
    };

    await sheetsApi.spreadsheets.batchUpdate(deleteRequest);
    console.log("All data except the first row deleted from Google Sheets.");
  } catch (error) {
    console.error("Error deleting data from Google Sheets:", error);
  }
};

module.exports = {
  createRos,
  getAllRos,
  getSingleRos,
  updateRos,
  searchRos,
  deleteRos,
  listAllRos,
};
