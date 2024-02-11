const asyncHandler = require("express-async-handler");
const { google } = require("googleapis");
const { JWT } = require("google-auth-library");
const credentials = require("../key.json");
const cloudinary = require("cloudinary").v2;
const shortid = require("shortid");
// const moment = require("moment");
const DataFlex = require("../models/dataFlexModel");
const Ros = require("../models/rosModel");

// Create a JWT client
const client = new JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// @DESC POST /apidataflex
const createDataFlex = asyncHandler(async (req, res) => {
  const data = req?.body;

  const dataFlex = await DataFlex.create(data);

  if (!dataFlex) {
    res.status(400);
    throw new Error("Error while creating dataFlex.");
  }

  await writeDataToSheet(dataFlex);

  res.status(201).json({ dataFlex, success: true });
});

// @DESC GET /apidataflex/all
const getAllDataFlex = asyncHandler(async (req, res) => {
  const page = parseInt(req?.query?.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const dataFlex = await DataFlex.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const dataFlexCount = await DataFlex.countDocuments();

  if (!dataFlex || dataFlex.length === 0) {
    res.status(400);
    throw new Error("No DataFlex Found!");
  }

  res.status(200).json({
    dataFlex: dataFlex,
    success: true,
    dataFlexCount: dataFlexCount,
  });
});

const listAllDataFlex = asyncHandler(async (req, res) => {
  const dataFlex = await DataFlex.find({}, { quoteName: 1, _id: 1 });

  if (!dataFlex || dataFlex.length === 0) {
    res.status(400);
    throw new Error("No dataFlex Found!");
  }

  res.status(200).json({
    data: dataFlex,
    success: true,
  });
});

// @desc Get single dataFlex details
// @route GET /apidataflex/:id
const getSingleDataFlex = asyncHandler(async (req, res) => {
  const dataFlex = await DataFlex.findById(req.params.id);

  if (!dataFlex) {
    res.status(404);
    throw new Error("DataFlex not found");
  }

  res.status(200).json({ dataFlex, success: true });
});

// @DESC PUT /apidataflex/:id
const updateDataFlex = asyncHandler(async (req, res) => {
  const dataFlexId = req?.params?.id;

  if (!dataFlexId) {
    res.status(400);
    throw new Error("Please provide the dataFlex Id.");
  }

  const dataFlex = await DataFlex.findById(dataFlexId);

  if (!dataFlex) {
    res.status(404);
    throw new Error("DataFlex not found");
  }

  let data = req.body;

  const updatedDataFlex = await DataFlex.findByIdAndUpdate(dataFlexId, data, {
    new: true,
  });

  if (!updatedDataFlex) {
    res.status(400);
    throw new Error("Error while creating dataFlex.");
  }

  await updateDataFlexSheetData(updatedDataFlex);

  res.status(200).json({ dataFlex: updatedDataFlex, success: true });
});

// Search
const searchDataFlex = asyncHandler(async (req, res) => {
  const query = req.params.query;
  const page = parseInt(req?.query?.page) || 1;
  const limit = 10;

  const skip = (page - 1) * limit;

  const results = await DataFlex.find({
    $or: [{ quoteName: { $regex: query, $options: "i" } }],
  })
    .skip(skip)
    .limit(limit);

  if (!results || results.length === 0) {
    res.status(404);
    throw new Error("No dataFlex found!");
  }

  res.status(200).json({ dataFlex: results, success: true });
});

// Write Data in Sheet
const writeDataToSheet = async (data) => {
  try {
    console.log("data", data);
    await client.authorize();
    const sheetsApi = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "DataFlex";

    const filteredData = {
      _id: data._id,
      quoteName: data.quoteName,
    };

    // Get the last row in the sheet
    const lastRowResponse = await sheetsApi.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:B`,
    });
    const values = lastRowResponse.data.values || [];
    const lastRow = values.length;

    const range = `${sheetName}!A${lastRow + 1}:B${lastRow + 1}`;

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

// Update DataFlex Details in Sheet
const updateDataFlexSheetData = async (data) => {
  try {
    await client.authorize();
    const sheetsApi = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "DataFlex";

    const filteredData = {
      _id: data._id.toString(),
      quoteName: data.quoteName,
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

const deleteDataFlex = asyncHandler(async (req, res) => {
  const id = req?.params?.id;

  if (!id) {
    res.status(400);
    throw new Error("Please provide the dataFlex Id.");
  }

  const dataFlex = await DataFlex.findById(id);

  if (!dataFlex) {
    res.status(404);
    throw new Error("DataFlex not found!");
  }

  await DataFlex.deleteOne({ _id: req?.params?.id });

  await deleteSheetData(id);

  res.status(200).json({ success: true });
});

// const deleteAllRos = asyncHandler(async (req, res) => {
//   try {
//     const deleteResult = await DataFlex.deleteMany({});

//     await deleteAllDataExceptFirstRow();

//     res.status(200).json({
//       success: true,
//       message: `Deleted ${deleteResult.deletedCount} dataFlex.`,
//     });
//   } catch (error) {
//     console.error("Error deleting dataFlex:", error);
//     res.status(500).json({ success: false, error: "Internal Server Error" });
//   }
// });

const deleteSheetData = async (_id) => {
  try {
    await client.authorize();
    const sheetsApi = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "DataFlex";

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
    const sheetName = "DataFlex";

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

const fetchFlexRefSheet = asyncHandler(async (req, res) => {
  const result = await fetchSheetData();

  res.json({ data: result, success: true });
});

const fetchSheetData = async () => {
  try {
    await client.authorize();
    const sheetsApi = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "Flex Ref Sheet"; // Replace with your actual sheet name

    const range = `${sheetName}!A2:A`; // Adjust the range to include the relevant columns and starting from row 2

    const response = await sheetsApi.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values;

    if (!values || values.length === 0) {
      console.log("No data found in the specified range.");
      return [];
    }

    const rowData = values
      .map((row) => {
        const quoteName = row[0] || null; // Assuming only one column is fetched (column B)

        return {
          quoteName,
        };
      })
      .filter((row) => row.quoteName !== null); // Filter out rows where quoteName is null

    console.log("Fetched data from Google Sheets:", rowData);

    return rowData;
  } catch (error) {
    console.error("Error fetching data from Google Sheets:", error);
    return [];
  }
};

const fetchCrewRefSheetData = async () => {
  try {
    await client.authorize();
    const sheetsApi = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "CREW REF SHEET";

    const range = `${sheetName}!C2:C`;

    const response = await sheetsApi.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values;

    if (!values || values.length === 0) {
      console.log("No data found in the specified range.");
      return [];
    }

    const rowData = values
      .map((row) => {
        const nickName = row[0] || null;

        return {
          nickName,
        };
      })
      .filter((row) => row.nickName !== null);

    console.log("Fetched data from Google Sheets:", rowData);

    return rowData;
  } catch (error) {
    console.error("Error fetching data from Google Sheets:", error);
    return [];
  }
};

const getCrewRefSheetData = asyncHandler(async (req, res) => {
  const data = await fetchCrewRefSheetData();

  if (data || data.length > 0) {
    res.status(200).json({ data, success: true });
  } else {
    res.status(500).json({ message: "No Data Found!", success: false });
  }
});

const fetchFaqSheetData = async () => {
  try {
    await client.authorize();
    const sheetsApi = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "FAQ - Reference Sheet";

    const range = `${sheetName}!A2:A`;

    const response = await sheetsApi.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values;

    if (!values || values.length === 0) {
      console.log("No data found in the specified range.");
      return [];
    }

    const rowData = values
      .map((row) => {
        const item = row[0] || null;

        return {
          item,
        };
      })
      .filter((row) => row.item !== null && row.item.startsWith("CS")); // Filter items starting with "CS"

    console.log("Fetched data from Google Sheets:", rowData);

    return rowData;
  } catch (error) {
    console.error("Error fetching data from Google Sheets:", error);
    return [];
  }
};

const getFaqSheetData = asyncHandler(async (req, res) => {
  const data = await fetchFaqSheetData();

  if (data || data.length > 0) {
    res.status(200).json({ data, success: true });
  } else {
    res.status(500).json({ message: "No Data Found!", success: false });
  }
});

const fetchNickNameAndTierLevelSheetData = async () => {
  try {
    await client.authorize();
    const sheetsApi = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "CREW REF SHEET"; // Replace with your actual sheet name

    const range = `${sheetName}!C:F`; // Adjust the range to include the relevant columns

    const response = await sheetsApi.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values;

    if (!values || values.length === 0) {
      console.log("No data found in the specified range.");
      return [];
    }

    // Assuming the first row contains headers, so skipping it
    const headerRow = values[0];
    const columnIndex = {
      nickName: headerRow.indexOf("NICKNAME "),
      tierLevel: headerRow.indexOf("TIER/LEVEL"),
    };

    const rowData = values.slice(1).map((row) => {
      const nickName = row[columnIndex.nickName] || null;
      const tierLevel = row[columnIndex.tierLevel] || "N/A";
      const id = shortid.generate();

      return {
        id,
        nickName,
        tierLevel,
      };
    });

    // console.log("Fetched data from Google Sheets:", rowData);

    return rowData;
  } catch (error) {
    console.error("Error fetching data from Google Sheets:", error);
    return [];
  }
};

const getNickNameWithTierLevel = asyncHandler(async (req, res) => {
  const data = await fetchNickNameAndTierLevelSheetData();

  if (data && data.length > 0) {
    res.status(200).json({ data, success: true });
  } else {
    res.status(500).json({ message: "No Data Found!", success: false });
  }
});

const getSingleCrewRefController = asyncHandler(async (req, res) => {
  const query = req.query.query;
  const crewRefData = await fetchNickNameAndTierLevelSheetData();
  const ros = await Ros.find({ assignedTo: query });

  const result = crewRefData.filter((item) => item.nickName === query);

  if (!result || result.length === 0) {
    return res.status(404).json({ message: "No Data Found!", success: false });
  }

  if (!ros || ros.length === 0) {
    return res.status(404).json({ message: "No Data Found!", success: false });
  }

  res.status(200).json({ rosData: ros, data: result, success: true });
});

const getSingleShowRefController = asyncHandler(async (req, res) => {
  const query = req.query.query;

  const crewRefData = await fetchNickNameAndTierLevelSheetData();
  const ros = await Ros.find({ show: query });

  if (!ros || ros.length === 0) {
    return res
      .status(404)
      .json({ message: "No Ros Data Found!", success: false });
  }

  const assignedToSet = new Set(ros.map((elem) => elem.assignedTo));
  const filteredCrewRefData = crewRefData.filter((item) =>
    assignedToSet.has(item.nickName)
  );

  if (!filteredCrewRefData || filteredCrewRefData.length === 0) {
    return res
      .status(404)
      .json({ message: "No Filtered Crew Ref Data Found!", success: false });
  }

  res
    .status(200)
    .json({ data: ros, result: filteredCrewRefData, success: true });
});

const getTierLevelController = asyncHandler(async (req, res) => {
  const query = req.query.query;
  const crewRefData = await fetchNickNameAndTierLevelSheetData();
  // const ros = await Ros.find();

  const result = crewRefData.filter((item) => item.tierLevel === query);

  if (!result || result.length === 0) {
    return res.status(404).json({ message: "No Data Found!", success: false });
  }

  // if (!ros || ros.length === 0) {
  //   return res.status(404).json({ message: "No Data Found!", success: false });
  // }

  // const result2 = ros.filter((item) => item.assignedTo === query);

  res.status(200).json({ data: result, success: true });
});

const fetchFinanceRefSheetData = async () => {
  try {
    await client.authorize();
    const sheetsApi = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "Finance Ref Sheet"; // Replace with your actual sheet name

    const range = `${sheetName}!A:C`; // Adjust the range to include the relevant columns

    const response = await sheetsApi.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values;

    if (!values || values.length === 0) {
      console.log("No data found in the specified range.");
      return [];
    }

    // Assuming the first row contains headers, so skipping it
    const headerRow = values[0];
    const columnIndex = {
      payPeriodStart: headerRow.indexOf("Pay Period Start"),
      payPeriodEnd: headerRow.indexOf("Pay Period End"),
      payDataPeriod: headerRow.indexOf("Pay Date for this period"),
    };

    const rowData = values.slice(1).map((row) => {
      const payPeriodStart = row[columnIndex.payPeriodStart] || null;
      const payPeriodEnd = row[columnIndex.payPeriodEnd] || null;
      const payDataPeriod = row[columnIndex.payDataPeriod] || null;

      return {
        payPeriodStart,
        payPeriodEnd,
        payDataPeriod,
      };
    });

    return rowData;
  } catch (error) {
    console.error("Error fetching data from Google Sheets:", error);
    return [];
  }
};

const getFinanceRefSheetData = asyncHandler(async (req, res) => {
  const data = await fetchFinanceRefSheetData();

  if (data && data.length > 0) {
    res.status(200).json({ data, success: true });
  } else {
    res.status(500).json({ message: "No Data Found!", success: false });
  }
});

const fetchNickNameAndPay = async () => {
  try {
    await client.authorize();
    const sheetsApi = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "CREW REF SHEET"; // Replace with your actual sheet name

    const range = `${sheetName}!C:H`; // Adjust the range to include the relevant columns

    const response = await sheetsApi.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = response.data.values;

    if (!values || values.length === 0) {
      console.log("No data found in the specified range.");
      return [];
    }

    // Assuming the first row contains headers, so skipping it
    const headerRow = values[0];
    const columnIndex = {
      nickname: headerRow.indexOf("NICKNAME "),
      payRate: headerRow.indexOf("2024 RATE"),
    };

    const rowData = values.slice(1).map((row) => {
      const nickname = row[columnIndex.nickname] || null;
      const payRate = row[columnIndex.payRate] || null;

      return {
        nickname,
        payRate,
      };
    });

    return rowData;
  } catch (error) {
    console.error("Error fetching data from Google Sheets:", error);
    return [];
  }
};

const getNickNameAndPay = asyncHandler(async (req, res) => {
  const data = await fetchNickNameAndPay();

  if (data && data.length > 0) {
    res.status(200).json({ data, success: true });
  } else {
    res.status(500).json({ message: "No Data Found!", success: false });
  }
});

module.exports = {
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
};
