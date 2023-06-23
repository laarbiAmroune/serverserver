const { default: mongoose } = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../db/Schema/User");
const Resto = require("../db/Schema/Restaurant");
const Reserve = require("../db/Schema/Reservation");
const session = require("express-session");
const { generateToken, decodeToken } = require("../config/generateToken");
const asyncHandler = require("express-async-handler");
const nodemailer = require("nodemailer");
const axios = require("axios");
const sendinBlue = require("sendinblue-api");
const apiKey = "haqjwxdmqffvmiwz"; // Replace with your Sendinblue API key
const senderEmail = "elmida605@gmail.com"; // Replace with your sender email address
const path = require("path"); // Import the path module
const handleNewUser = async (req, res) => {
  const name = req.body.name;
  const passe = req.body.passe;
  const email = req.body.email;
  const file = req.file;
  const API_URL = req.query.API_URL;
  console.log(email);
  console.log(API_URL);

  if (!passe || !email)
    return res
      .status(400)
      .json({ message: "Username and password are required." });

  try {
    const verificationToken = generateToken();

    let result;

    if (file) {
      result = await User.create({
        username: name,
        password: passe,
        email: email,
        picture: file.filename,
        verificationToken: verificationToken,
      });
    } else {
      result = await User.create({
        username: name,
        password: passe,
        email: email,
        verificationToken: verificationToken,
      });
    }
    console.log("User created");
    const idU = result._id;
    sendVerificationEmail(email, idU, API_URL);

    console.log("Verification email sent");
    res.status(201).json({ success: `New user ${name} created!` });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ message: err.message });
  }
};

////////////////////////////////////////////////

async function authAdmin(req, res, next) {
  const email = req.body.email;
  const password = req.body.password;
  console.log(email);
  if (!password || !email)
    res.status(400).json({ message: "Username and password are required." });
  const user = await User.findOne({ email });
  if (user && user.isAdmin && (await user.matchPassword(password))) {
    const token = generateToken(user._id);
    const idU = user._id;
    console.log("ok");
    res.json({ token, idU });
  } else {
    res.status(403).json({ message: "Access denied." });
  }
}
const authUser = asyncHandler(async (req, res) => {
  console.log("authentification user ");
  const email = req.body.email;
  const password = req.body.password;

  if (!password || !email)
    res.status(500).json({ message: "Username and password are required." });
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    console.log(user.verified);
    if (user.verified === false) {
      return res.status(402).json("veulliez confirmer votre email ");
    }
    if (user.archived === true) {
      return res
        .status(403)
        .json("Desole, vous ne pouvez plus accedez a votre compte ");
    }
    const token = generateToken(user._id);
    const idU = user._id;
    console.log("ok");
    res.json({ token, idU });
  } else {
    res.status(400).json("Invalid Email or Password");
    throw new Error("Invalid Email or Password");
  }
});
const handlegetuser = asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  console.log(req.headers.authorization);
  try {
    // Verify the token
    const decodedToken = decodeToken(token);
    console.log(decodedToken);

    // Find the user with the decoded ID
    const user = await User.findById(decodedToken.id)
      .populate({
        path: "Restos",
        match: { isConfirmed: true }, // Add the match condition for verified restaurants
      })
      .populate("followings")
      .populate({
        path: "reservations",
        populate: {
          path: "Resto",
          select: "name avatar",
          match: { isConfirmed: true },
        },
      })
      .exec();

    // If the user doesn't exist, return an error
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.log(user.reservations.time);
    // Return the user object as a response
    res.json(user);
    console.log(user);
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Unauthorized" });
  }
});
const handleupdateuser = asyncHandler(async (req, res) => {
  /* try {
    const { name, email } = req.body;
    console.log(name);
    console.log(req.query.id);
    const user = await User.findById(req.query.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.username = name || user.name;
    user.email = email || user.email;

    await user.save();
    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }*/

  const { email, name } = req.body;
  const password = req.body.password;

  console.log("id:" + req.query.id);
  const userId = req.query.id;
  try {
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId },
      { username: name, email: email },
      { new: true }
    );

    console.log(`User ${userId} updated successfully: ${updatedUser}`);
    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
    console.error(`Error updating user ${userId}: ${err}`);
  }
});

const handledeleteteuser = asyncHandler(async (req, res) => {
  console.log("id:" + req.query.idU);

  try {
    const id = req.query.idU; // Assuming you pass the user ID as a route parameter

    // Find the user by ID and update the 'archived' field to true
    const user = await User.findByIdAndUpdate(id, { archived: true });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User archived successfully" });
    console.log("archived");
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error archiving user" });
  }
});

const getAllUsers = async (req, res) => {
  console.log("admin users");
  // const users = await User.find().select();

  const users = await User.find({ isAdmin: { $ne: true }, archived: false });
  res.status(200).json(users);
};

//controller update password
const putPasswordUser = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // Recherche de l'utilisateur par ID
    const user = await User.findById(req.query.id);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Vérification du mot de passe actuel
    const isPasswordMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordMatch) {
      return res.status(401).json({ message: "Mot de passe actuel incorrect" });
    }

    // Mise à jour du mot de passe de l'utilisateur
    user.password = newPassword;
    await user.save();

    res.json({ message: "Mot de passe mis à jour avec succès" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const handleValidateEmail = async (req, res) => {
  const { id } = req.params;

  try {
    // Find the user with the provided ID
    const user = await User.findByIdAndUpdate(
      id,
      { verified: true },
      { new: true }
    );

    if (!user) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Send the confirmation.html file
    return res.sendFile(path.join(__dirname, "public", "confirmation.html"));
  } catch (error) {
    console.error("Error confirming email:", error);
    return res.status(500).json({ error: "Failed to confirm email" });
  }
};
const sentNewVerificationLink = (res) => {
  res.redirect("/?verified=false&verificationresent=true");
};

const verificationLinkUnvalid = (res) => {
  res.redirect("/?verified=false&verificationresent=flase&unvalidlink=true");
};

const verified = (res) => {
  res.redirect("/?verified=true");
};

module.exports = {
  handleNewUser,
  authUser,
  handlegetuser,
  handleupdateuser,
  handledeleteteuser,
  authAdmin,
  getAllUsers,
  putPasswordUser,
  handleValidateEmail,
};

const sendVerificationEmail = async (email, idU, API_URL) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: senderEmail,
        pass: apiKey,
      },
    });

    const info = await transporter.sendMail({
      from: senderEmail,
      to: email,
      subject: "Email Verification",
      text: "Please verify your email address.",
      html: `<!DOCTYPE html>
      <html>
      <head>
      
        <meta charset="utf-8">
        <meta http-equiv="x-ua-compatible" content="ie=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style type="text/css">
        /**
         * Google webfonts. Recommended to include the .woff version for cross-client compatibility.
         */
        @media screen {
          @font-face {
            font-family: 'Source Sans Pro';
            font-style: normal;
            font-weight: 400;
            src: local('Source Sans Pro Regular'), local('SourceSansPro-Regular'), url(https://fonts.gstatic.com/s/sourcesanspro/v10/ODelI1aHBYDBqgeIAH2zlBM0YzuT7MdOe03otPbuUS0.woff) format('woff');
          }
          @font-face {
            font-family: 'Source Sans Pro';
            font-style: normal;
            font-weight: 700;
            src: local('Source Sans Pro Bold'), local('SourceSansPro-Bold'), url(https://fonts.gstatic.com/s/sourcesanspro/v10/toadOcfmlt9b38dHJxOBGFkQc6VGVFSmCnC_l7QZG60.woff) format('woff');
          }
        }
        /**
         * Avoid browser level font resizing.
         * 1. Windows Mobile
         * 2. iOS / OSX
         */
        body,
        table,
        td,
        a {
          -ms-text-size-adjust: 100%; /* 1 */
          -webkit-text-size-adjust: 100%; /* 2 */
        }
        /**
         * Remove extra space added to tables and cells in Outlook.
         */
        table,
        td {
          mso-table-rspace: 0pt;
          mso-table-lspace: 0pt;
        }
        /**
         * Better fluid images in Internet Explorer.
         */
        img {
          -ms-interpolation-mode: bicubic;
        }
        /**
         * Remove blue links for iOS devices.
         */
        a[x-apple-data-detectors] {
          font-family: inherit !important;
          font-size: inherit !important;
          font-weight: inherit !important;
          line-height: inherit !important;
          color: inherit !important;
          text-decoration: none !important;
        }
        /**
         * Fix centering issues in Android 4.4.
         */
        div[style*="margin: 16px 0;"] {
          margin: 0 !important;
        }
        body {
          width: 100% !important;
          height: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        /**
         * Collapse table borders to avoid space between cells.
         */
        table {
          border-collapse: collapse !important;
        }
        a {
          color: #24a892;
        }
        img {
          height: auto;
          line-height: 100%;
          text-decoration: none;
          border: 0;
          outline: none;
        }
        </style>
      
      </head>
      <body style="background-color: #e9ecef;">
      
        <!-- start preheader -->
        <div class="preheader" style="display: none; max-width: 0; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
          A preheader is the short summary text that follows the subject line when an email is viewed in the inbox.
        </div>
        <!-- end preheader -->
      
        <!-- start body -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
      
          <!-- start logo -->
          <tr>
            <td align="center" bgcolor="#e9ecef">
              <!--[if (gte mso 9)|(IE)]>
              <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
              <tr>
              <td align="center" valign="top" width="600">
              <![endif]-->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                <tr>
                  <td align="center" valign="top" style="padding: 36px 24px;">
                    <a href="#" target="_blank" style="display: inline-block;">
                 
                    </a>
                  </td>
                </tr>
              </table>
              <!--[if (gte mso 9)|(IE)]>
              </td>
              </tr>
              </table>
              <![endif]-->
            </td>
          </tr>
          <!-- end logo -->
      
          <!-- start hero -->
          <tr>
            <td align="center" bgcolor="#e9ecef">
              <!--[if (gte mso 9)|(IE)]>
              <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
              <tr>
              <td align="center" valign="top" width="600">
              <![endif]-->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                <tr>
                  <td align="left" bgcolor="#ffffff" style="padding: 36px 24px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; border-top: 3px solid #d4dadf;">
                    <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -1px; line-height: 48px;">Bonjour </h1>
                  </td>
                </tr>
              </table>
              <!--[if (gte mso 9)|(IE)]>
              </td>
              </tr>
              </table>
              <![endif]-->
            </td>
          </tr>
          <!-- end hero -->
      
          <!-- start copy block -->
          <tr>
            <td align="center" bgcolor="#e9ecef">
              <!--[if (gte mso 9)|(IE)]>
              <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
              <tr>
              <td align="center" valign="top" width="600">
              <![endif]-->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
      
                <!-- start copy -->
                <tr>
                  <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
                    <p style="margin: 0;">Merci de commencer avec notre Plateforme!</p><br>
                    <p style="margin: 0;">Nous avons besoin d'un peu plus d'informations pour compléter votre inscription, y compris une confirmation de votre adresse e-mail.</p><br>
                    <p style="margin: 0;">Cliquez ci-dessous pour confirmer votre adresse e-mail:
                  </td>
                </tr>
                <!-- end copy -->
      
                <!-- start button -->
                <tr>
                  <td align="left" bgcolor="#ffffff">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center" bgcolor="#ffffff" style="padding: 12px;">
                          <table border="0" cellpadding="0" cellspacing="0">
                            <tr>
                            <h1>Welcome to Your App</h1>
                            <p>Please click the button below to confirm your email address.</p>
                            <a class="button" href='${API_URL}/confirmation/${idU}'>Confirm Email</a>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- end button -->
      
                <!-- start copy -->
                <tr>
                  <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
                    <p style="margin: 0;">Si vous rencontrez des problèmes, veuillez coller l'URL ci-dessus dans votre navigateur web</p>
                 
                  </td>
                </tr>
                <!-- end copy -->
      
                <!-- start copy -->
                <tr>
                  <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; border-bottom: 3px solid #d4dadf">
                    <p style="margin: 0;">Salutations,<br>ElMaida Community</p>
                  </td>
                </tr>
                <!-- end copy -->
      
              </table>
              <!--[if (gte mso 9)|(IE)]>
              </td>
              </tr>
              </table>
              <![endif]-->
            </td>
          </tr>
          <!-- end copy block -->
      
          <!-- start footer -->
          <tr>
            <td align="center" bgcolor="#e9ecef" style="padding: 24px;">
              <!--[if (gte mso 9)|(IE)]>
              <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
              <tr>
              <td align="center" valign="top" width="600">
              <![endif]-->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
      
                <!-- start permission -->
                <tr>
                  <td align="center" bgcolor="#e9ecef" style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666;">
                    <p style="margin: 0;">Vous avez reçu cet e-mail car nous avons reçu une demande d'inscription pour votre compte. Si vous n'avez pas demandé cette action, vous pouvez supprimer cet e-mail en toute sécurité.</p>
                  </td>
                </tr>
                <!-- end permission -->
      
                <!-- start unsubscribe -->
                <tr>
                  <td align="center" bgcolor="#e9ecef" style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666;">
                    
                    <p style="margin: 0;">UMMTO</p><p style="margin: 0;">ELMAIDA COMMUNITY</p>
                  </td>
                </tr>
                <!-- end unsubscribe -->
      
              </table>
              <!--[if (gte mso 9)|(IE)]>
              </td>
              </tr>
              </table>
              <![endif]-->
            </td>
          </tr>
          <!-- end footer -->
      
        </table>
        <!-- end body -->
      
      </body>
      </html>`,
    });

    console.log("Verification email sent");
    console.log("Message sent:", info.messageId);
  } catch (err) {
    console.error("Error sending email:", err);
  }
};
