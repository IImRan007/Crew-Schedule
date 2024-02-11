const asyncHandler = require("express-async-handler");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;

const User = require("../models/userModel");

// @DESC /api/user/login
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req?.body;

  if (!email) {
    res.status(400);
    throw new Error("Please provide the email field!");
  }
  if (!password) {
    res.status(400);
    throw new Error("Please provide the password field!");
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(400);
    throw new Error("User Not Found!");
  }

  if (user.email !== email) {
    res.status(400);
    throw new Error("Incorrect Email!");
  }

  if (user.password !== password) {
    res.status(400);
    throw new Error("Incorrect Password!");
  }

  if (user.isActive === false) {
    res.status(400);
    throw new Error(
      "You don't have permission to login prease contact Super Admin."
    );
  }

  if (user && user.email == email && user.password == password) {
    res.status(200).json({
      _id: user._id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      username: user.username,
      success: true,
    });
  } else {
    res.status(401);
    throw new Error("Invalid credentials");
  }
});

const getMe = asyncHandler(async (req, res) => {
  const id = req?.params?.id;

  const user = await User.findById(id).select("-password");

  if (!user) {
    res.status(404).json({ success: false, message: "User Not Found!" });
  }

  res.status(200).json({ user: user, success: true });
});

const registeruser = asyncHandler(async (req, res) => {
  const { email, password, role, username } = req.body;

  const user = await User.findOne({ email });

  if (user) {
    res.status(400);
    throw new Error("User already exists");
  }

  const createdUser = await User.create({
    email: email,
    password: password,
    username: username,
    role: role,
  });

  if (createdUser) {
    await sendMail(
      createdUser.email,
      createdUser.password,
      createdUser.username
    );

    res.status(201).json({
      user: createdUser,
      message: `User Created with email: ${email}`,
      success: true,
    });
  } else {
    res
      .status(400)
      .json({ message: "Error while creating user", success: false });
  }
});

const listAllusers = asyncHandler(async (req, res) => {
  const page = parseInt(req?.query?.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const users = await User.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("-password");

  if (!users || users.length === 0) {
    res.status(404);
    throw new Error("Users nor found!");
  }
  const count = await User.countDocuments();

  res.status(200).json({ users, count, success: true });
});

const updateUser = asyncHandler(async (req, res) => {
  const id = req.params.id;

  if (!id) {
    res.status(404);
    throw new Errpr("Please provide the user id.");
  }

  const userExists = await User.findById(id);

  if (!userExists) {
    res.status(404);
    throw new Error("User not exists!");
  }
  let data = req.body;

  const user = await User.findByIdAndUpdate(id, data, {
    new: true,
  });

  if (!user) {
    res.status(400);
    throw new Error("Error while updating user!");
  }

  res.status(200).json({ data: user, success: true });
});

const deleteUser = asyncHandler(async (req, res) => {
  const id = req.params.id;

  if (!id) {
    res.status(404);
    throw new Errpr("Please provide the user id.");
  }

  const userExists = await User.findById(id);

  if (!userExists) {
    res.status(404);
    throw new Error("User not exists!");
  }

  await User.deleteOne({ _id: id });

  res.status(200).json({ success: true });
});

const createTransporter = async () => {
  try {
    const oauth2Client = new OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.REFRESH_TOKEN,
    });

    const accessToken = await new Promise((resolve, reject) => {
      oauth2Client.getAccessToken((err, token) => {
        if (err) {
          console.log("*ERR: ", err);
          reject();
        }
        resolve(token);
      });
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.USER_EMAIL,
        accessToken,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
      },
    });
    return transporter;
  } catch (err) {
    return err;
  }
};

const sendMail = async (email, password, username) => {
  try {
    const mailOptions = {
      from: process.env.USER_EMAIL,
      to: email,
      subject: "Login Credentials",
      html: `<!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          a{
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <h1>Hello, ${username}</h1>
        <h2>Please find your login credentials below.</h2>
        <h3>Email: ${email}</h3>
        <h3>Password: ${password}</h3>
        <a href="https://crew-schedule-sigma.vercel.app/">Login Here</a>
      </body>
      </html>`,
    };

    let emailTransporter = await createTransporter();
    await emailTransporter.sendMail(mailOptions);
    console.log("Email Sent Successfully!");
  } catch (err) {
    console.log("ERROR: ", err);
  }
};

module.exports = {
  loginUser,
  getMe,
  registeruser,
  listAllusers,
  updateUser,
  deleteUser,
};
