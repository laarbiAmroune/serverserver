const { default: mongoose } = require("mongoose");

const bcrypt = require("bcryptjs");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    username: {
      default: "Propritaire_Restaurant",
      type: String,
      trim: true, //enlever les espace
    },
    picture: {
      type: "String",

      default: "default.jpg",
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    archived: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
    },

    email: {
      type: String,
      required: true,
      trim: true, //enlever les espace
      // unique: true,
      lowercase: true,
      minLenght: 8,
    },
    password: {
      type: String,
      required: true, //require true pour que le champs soit obligatoire
    },
    Restos: [{ type: mongoose.SchemaTypes.ObjectID, ref: "Resto" }],
    followings: [{ type: mongoose.SchemaTypes.ObjectID, ref: "Resto" }],
    reservations: [{ type: mongoose.SchemaTypes.ObjectID, ref: "Reserve" }],
  },
  { timestamps: true } //date of creation and date of update
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

/*
userSchema.pre("save", async function (next) {
  if (!this.isModified) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});*/

userSchema.pre("save", async function (next) {
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
const User = mongoose.model("User", userSchema);

module.exports = User;
