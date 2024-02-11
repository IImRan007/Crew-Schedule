const asyncHandler = require("express-async-handler");
const { google } = require("googleapis");
const { JWT } = require("google-auth-library");
const credentials = require("../key.json");
const cloudinary = require("cloudinary").v2;
// const moment = require("moment");
const CrewRef = require("../models/crewRefModel");

// Create a JWT client
const client = new JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// @DESC POST /api/crewref
const createCrewRef = asyncHandler(async (req, res) => {
  const data = req?.body;

  const crewRef = await CrewRef.create(data);

  if (!crewRef) {
    res.status(400);
    throw new Error("Error while creating crewRef.");
  }

  await writeDataToSheet(crewRef);

  res.status(201).json({ data: crewRef, success: true });
});

// @DESC GET /api/crewref/all
const getAllCrewRef = asyncHandler(async (req, res) => {
  const page = parseInt(req?.query?.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const crewRef = await CrewRef.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const count = await CrewRef.countDocuments();

  if (!crewRef || crewRef.length === 0) {
    res.status(400);
    throw new Error("No CrewRef Found!");
  }

  res.status(200).json({
    data: crewRef,
    success: true,
    count: count,
  });
});

// /listall
const listAllCrewRef = asyncHandler(async (req, res) => {
  const crewRef = await CrewRef.find({}, { nickName: 1, _id: 1 });

  if (!crewRef || crewRef.length === 0) {
    res.status(400);
    throw new Error("No CrewRef Found!");
  }

  res.status(200).json({
    data: crewRef,
    success: true,
  });
});

// @desc Get single crewRef details
// @route GET /api/crewref/:id
const getSingleCrewRef = asyncHandler(async (req, res) => {
  const crewRef = await CrewRef.findById(req.params.id);

  if (!crewRef) {
    res.status(404);
    throw new Error("CrewRef not found");
  }

  res.status(200).json({ data: crewRef, success: true });
});

// @DESC PUT /api/crewref/:id
const updateCrewRef = asyncHandler(async (req, res) => {
  const crewRefId = req?.params?.id;

  if (!crewRefId) {
    res.status(400);
    throw new Error("Please provide the crewRef Id.");
  }

  const crewRef = await CrewRef.findById(crewRefId);

  if (!crewRef) {
    res.status(404);
    throw new Error("CrewRef not found");
  }

  let data = req.body;

  const updatedCrewRef = await CrewRef.findByIdAndUpdate(crewRefId, data, {
    new: true,
  });

  if (!updatedCrewRef) {
    res.status(400);
    throw new Error("Error while creating crewRef.");
  }

  await updateDataFlexSheetData(updatedCrewRef);

  res.status(200).json({ data: updatedCrewRef, success: true });
});

// Search
const searchCrewRef = asyncHandler(async (req, res) => {
  const query = req.params.query;
  const page = parseInt(req?.query?.page) || 1;
  const limit = 10;

  const skip = (page - 1) * limit;

  const results = await CrewRef.find({
    $or: [{ nickName: { $regex: query, $options: "i" } }],
  })
    .skip(skip)
    .limit(limit);

  if (!results || results.length === 0) {
    res.status(404);
    throw new Error("No crewRef found!");
  }

  res.status(200).json({ data: results, success: true });
});

// Write Data in Sheet
const writeDataToSheet = async (data) => {
  try {
    console.log("data", data);
    await client.authorize();
    const sheetsApi = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "CREW REF SHEET";

    const filteredData = {
      _id: data._id,
      firstName: data.firstName,
      lastName: data.lastName,
      nickName: data.nickName,
    };

    // Get the last row in the sheet
    const lastRowResponse = await sheetsApi.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:D`,
    });

    const values = lastRowResponse.data.values || [];
    const lastRow = values.length;

    const range = `${sheetName}!A${lastRow + 1}:D${lastRow + 1}`;

    console.log(range);
    const request = {
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      resource: {
        values: [Object.values(filteredData)],
      },
    };

    const appendResponse = await sheetsApi.spreadsheets.values.append(request);
    console.log("Data written to Google Sheets:", appendResponse.data);
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

// Update CrewRef Details in Sheet
const updateDataFlexSheetData = async (data) => {
  try {
    await client.authorize();
    const sheetsApi = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "CREW REF SHEET";

    const filteredData = {
      _id: data._id.toString(),
      firstName: data.firstName,
      lastName: data.lastName,
      nickName: data.nickName,
    };

    const range = `${sheetName}!A:A`; // Specify the range to search for the _id in column A

    const existingData = await sheetsApi.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const existingValues = existingData.data.values || [];
    const rowIndex = existingValues.findIndex(
      (row) => row[0] === filteredData._id
    );

    if (rowIndex !== -1) {
      // If _id is found, update the existing row
      const request = {
        spreadsheetId,
        range: `${sheetName}!A${rowIndex + 1}`, // Update the row where _id is found
        valueInputOption: "RAW",
        resource: {
          values: [Object.values(filteredData)],
        },
      };

      const updateResponse = await sheetsApi.spreadsheets.values.update(
        request
      );
      console.log("Data updated in Google Sheets:", updateResponse.data);
    } else {
      console.log("Id not found", data._id);
    }
  } catch (error) {
    console.error("Error writing/updating to Google Sheets:", error);
  }
};

const deleteCrewRef = asyncHandler(async (req, res) => {
  const id = req?.params?.id;

  if (!id) {
    res.status(400);
    throw new Error("Please provide the crewRef Id.");
  }

  const crewRef = await CrewRef.findById(id);

  if (!crewRef) {
    res.status(404);
    throw new Error("CrewRef not found!");
  }

  await CrewRef.deleteOne({ _id: req?.params?.id });

  await deleteSheetData(id);

  res.status(200).json({ success: true });
});

// const deleteAllRos = asyncHandler(async (req, res) => {
//   try {
//     const deleteResult = await CrewRef.deleteMany({});

//     await deleteAllDataExceptFirstRow();

//     res.status(200).json({
//       success: true,
//       message: `Deleted ${deleteResult.deletedCount} crewRef.`,
//     });
//   } catch (error) {
//     console.error("Error deleting crewRef:", error);
//     res.status(500).json({ success: false, error: "Internal Server Error" });
//   }
// });

const deleteSheetData = async (_id) => {
  try {
    await client.authorize();
    const sheetsApi = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "CREW REF SHEET";

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

    // Find the row index based on the _id
    const findRequest = {
      spreadsheetId,
      range: `${sheetName}!A:A`,
    };

    const findResponse = await sheetsApi.spreadsheets.values.get(findRequest);
    const rowIndex = findResponse.data.values.findIndex((row) => row[0] == _id);

    if (rowIndex === -1) {
      console.log(`No matching row found for _id: ${_id}`);
      return;
    }

    // Delete the row using the retrieved sheetId
    const deleteRequest = {
      spreadsheetId,
      resource: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    };

    await sheetsApi.spreadsheets.batchUpdate(deleteRequest);
    console.log(`Row with _id ${_id} deleted from Google Sheets`);
  } catch (error) {
    console.error("Error deleting row from Google Sheets:", error);
  }
};

const deleteAllDataExceptFirstRow = async () => {
  try {
    await client.authorize();
    const sheetsApi = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "CrewRef";

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
  createCrewRef,
  getAllCrewRef,
  getSingleCrewRef,
  updateCrewRef,
  searchCrewRef,
  deleteCrewRef,
  listAllCrewRef,
};
