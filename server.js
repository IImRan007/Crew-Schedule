const express = require("express");
const connectDb = require("./db/connect");
require("dotenv").config();
require("colors");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const fileUpload = require("express-fileupload");
const { errorHandler } = require("./middleware/errorMiddleware");
const PORT = process.env.PORT || 5000;
const app = express();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

connectDb();

// Using Middleware
const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    optionsSuccessStatus: 204,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

// Routes
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/ros", require("./routes/rosRoutes"));
app.use("/api/dataflex", require("./routes/dataFlexRoutes"));
app.use("/api/crewref", require("./routes/crewRefRoutes"));
app.use("/api/faq", require("./routes/faqRoutes"));

app.get("/", (_, res) => {
  res.status(200).json({ message: "Crew Schedule API" });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log("Server is Running on Port:", PORT.blue);
});
