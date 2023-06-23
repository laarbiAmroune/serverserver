const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  image: { type: String },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: {
    type: String,
    required: true,
  },
});

const RestoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  isConfirmed: {
    type: Boolean,
    default: false,
  },
  reference: { type: String, required: true },

  avatar: {
    type: String,
    default: "default.png",
  },
  address: { type: String },
  owner: {
    type: mongoose.SchemaTypes.ObjectID,
    ref: "User",
  },
  menu: {
    name: { type: String },
    categories: [{ name: { type: String }, items: [itemSchema] }],
  },

  description: {
    type: String,
  },
  photos: [{ type: String }],

  cuisines: [
    {
      image: { type: String },
      name: { type: String },
    },
  ],

  phone: { type: String },

  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  price_average: { type: Number, default: 0.0 },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  reservations: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reserve" }],
  // openingHours: { type: String },
  openingHours: [
    {
      day: {
        type: String,
        enum: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
      },
      startTime: {
        type: String,
        default: "11:00:00 AM", // Default start time in format "12:00:00 AM"
      },
      endTime: {
        type: String,
        default: "11:59:59 PM", // Default end time in format "11:59:59 PM"
      },
    },
  ],
  comments: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      comment: String,
      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

// Add a pre-save middleware to add the default "plats" category
RestoSchema.pre("save", function (next) {
  // Check if "plats" category already exists
  const platsCategoryExists = this.menu.categories.some(
    (category) => category.name === "plats"
  );

  if (!platsCategoryExists) {
    // Add the default "plats" category
    this.menu.categories.unshift({
      name: "plats",
      items: [],
    });
  }

  next();
});

const Resto = mongoose.model("Resto", RestoSchema);

module.exports = Resto;
