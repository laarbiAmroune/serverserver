const jwt = require("jsonwebtoken");
const secretKey = "khlifa";
const generateToken = (id) => {
  return jwt.sign({ id }, secretKey, {
    expiresIn: "30d",
  });
};

const decodeToken = (token) => {
  return jwt.verify(token, secretKey);
};

module.exports = { generateToken, decodeToken };
