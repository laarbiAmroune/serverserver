const { default: mongoose } = require("mongoose");

const User = require("../db/Schema/User");
const Resto = require("../db/Schema/Restaurant");
const Reserve = require("../db/Schema/Reservation");
const session = require("express-session");
const generateToken = require("../config/generateToken");
const asyncHandler = require("express-async-handler");

const moment = require("moment-timezone");
const handlenewresto = asyncHandler(async function (req, res, next) {
  console.log("id:" + req.query.id);
  const userId = req.query.id.toString();

  const file = req.file;
  if (!file) {
    const error = new Error("Please upload a file");
    error.httpStatusCode = 400;
    return next(error);
  }

  const resto = new Resto();
  console.log(req.body.Reference + "reference");
  console.log(req.body.latitude);
  resto.name = req.body.name;
  resto.address = req.body.address;
  resto.avatar = req.file.filename;
  resto.owner = userId;
  resto.latitude = parseFloat(req.body.latitude);
  resto.longitude = parseFloat(req.body.longitude);
  resto.reference = req.body.RestoReference;

  try {
    await resto.save();
    console.log("ok");
    const newRestoId = resto._id;
    User.findByIdAndUpdate(
      userId,
      { $push: { Restos: newRestoId } },
      { new: true }
    )
      .then((user) => {
        console.log(`Successfully updated user ${user._id}`);
      })
      .catch((err) => {
        console.error(`Error updating user: ${err.message}`);
      });
    res.send(resto);
  } catch (error) {
    res.status(500).send(error);
  }
});

const handleupdateresto = asyncHandler(async function (req, res, next) {
  console.log("id:" + req.query.id);
  const restoId = req.query.id;

  if (!req.query) {
    res.status(500).send("no id send");
    console.log("no id");
  }
  if (!req.file) {
    console.log("no data");
  }
  if (req.file) {
    const photo = req.file.filename;
    console.log(photo);
    try {
      const update = await Resto.findByIdAndUpdate(
        restoId,
        { $push: { photos: photo } },
        { new: true }
      );
      console.log("ok");
      console.log(update.photos);

      res.json(update);
    } catch (error) {
      res.status(500).send(error);
    }
  }
  /*if (req.body) {
    const resto = req.body;
    console.log(resto);
    try {
      const update = await Resto.findOneAndUpdate(
        restoId,
        { resto },
        { new: true }
      );
    } catch (error) {
      res.status(500).send(error);
    }
  }*/
});

const handlefindresto = asyncHandler(async (req, response) => {
  const keyword = req.query.restoName
    ? {
        $or: [
          { name: { $regex: req.query.restoName, $options: "i" } },
          //  { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  const restos = await Resto.find(keyword);

  try {
    response.json(restos);
  } catch (error) {
    response.status(500).send(error);
  }
});
const handlegetresto = asyncHandler(async (req, response) => {
  const id = req.query.id;
  console.log(id);
  const restos = await Resto.findById(id)
    .populate("followers")
    .populate({
      path: "reservations",
      populate: {
        path: "user",
        select: "username picture",
      },
    })
    .exec();

  try {
    console.log(restos.price_average + "price overage");
    response.json(restos);
  } catch (error) {
    response.status(500).send(error);
  }
});

const handledeleteteresto = asyncHandler(async (req, res) => {
  console.log("id:" + req.query.idR);
  const restoId = req.query.idR;
  const userId = req.query.idU;

  try {
    // Remove the resto from Resto collection
    await Resto.deleteOne({ _id: restoId });

    // Remove resto reference from User collection's Restos array
    await User.updateMany({ Restos: restoId }, { $pull: { Restos: restoId } });

    // Remove resto reference from User collection's followings array
    await User.updateMany(
      { followings: restoId },
      { $pull: { followings: restoId } }
    );

    // Remove resto reference from Reserve collection
    await Reserve.updateMany(
      { Resto: restoId },
      { $unset: { Resto: restoId } }
    );

    res.status(200).json({ message: "Restaurant deleted successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while deleting the restaurant." });
  }
});

const follow = asyncHandler(async (req, res) => {
  const idU = req.query.idU;
  const idR = req.query.idR;
  console.log(idR);
  console.log(idU);
  try {
    // Find the restaurant by ID
    const restaurant = await Resto.findById(idR);

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Find the user by ID
    const user = await User.findById(idU);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Check if the user is already following the restaurant
    if (restaurant.followers.includes(idU)) {
      return res
        .status(400)
        .json({ message: "User is already following the restaurant" });
    }

    console.log(restaurant.followers);

    // Save the restaurant
    const updateR = await Resto.findByIdAndUpdate(
      idR,
      { $push: { followers: idU } },
      { new: true }
    );

    if (user.followings.includes(idR)) {
      return res
        .status(400)
        .json({ message: "Restaurant is already in the user's followings" });
    }

    const updateU = await User.findByIdAndUpdate(
      idU,
      { $push: { followings: idR } },
      { new: true }
    );
    console.log(user.followings);
    return res.status(200).json({ message: "Follower added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
const unfollow = asyncHandler(async (req, res) => {
  const idU = req.query.idU;
  const idR = req.query.idR.trim();
  console.log("idUser", idU);
  console.log("idResto", idR);
  try {
    // Find the restaurant by ID
    const restaurant = await Resto.findById(idR);

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Find the user by ID
    const user = await User.findById(idU);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the user is already following the restaurant
    if (!restaurant.followers.includes(idU)) {
      return res
        .status(400)
        .json({ message: "User is not following the restaurant" });
    }

    // Remove the user's ID from the followers array of the restaurant
    const updateR = await Resto.findByIdAndUpdate(
      idR,
      { $pull: { followers: idU } },
      { new: true }
    );

    // Remove the restaurant's ID from the followings array of the user
    const updateU = await User.findByIdAndUpdate(
      idU,
      { $pull: { followings: idR } },
      { new: true }
    );

    return res.status(200).json({ message: "Follower removed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
async function topRestos(req, res) {
  // Find the top 10 confirmed restaurants with the most followers
  const topRestosQuery = Resto.aggregate([
    { $match: { followers: { $exists: true }, isConfirmed: true } }, // Match confirmed restaurants that have the 'followers' field
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        price_average: 1,
        address: 1,
        avatar: 1,
        followerCount: { $size: "$followers" },
      },
    }, // Project the restaurant ID, name, avatar, and follower count
    { $sort: { followerCount: -1 } }, // Sort by follower count in descending order
    { $limit: 10 }, // Limit the result to 10 restaurants
  ]);

  // Execute the query
  topRestosQuery.exec((err, topRestos) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "An error occurred" });
      return;
    }

    res.json(topRestos);
  });
}

async function homePub(req, res) {
  try {
    const homePub = await Resto.aggregate([
      { $match: { isConfirmed: true } }, // Match only confirmed restaurants
      { $unwind: "$photos" }, // Unwind the photos array
      { $sample: { size: 10 } }, // Randomly sample 10 documents
    ]);

    const formattedData = homePub.map((item) => ({
      name: item.name,
      avatar: item.avatar,
      photo: item.photos,
      address: item.address,
      restoId: item._id,
    }));

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}
const recentsRestos = asyncHandler(async (req, res) => {
  try {
    const recentRestaurants = await Resto.find({ isConfirmed: true })
      .sort({ _id: -1 }) // Sort by descending order of _id (assumes _id is an auto-generated timestamp)
      .limit(10); // Limit the result to 10 restaurants

    res.json(recentRestaurants);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

const randomCuisines = asyncHandler(async (req, res) => {
  try {
    const cuisines = await Resto.aggregate([
      { $match: { isConfirmed: true } }, // Match only confirmed restaurants
      { $unwind: "$cuisines" }, // Unwind the cuisines array
      { $sample: { size: 10 } }, // Randomly sample 10 documents
    ]);

    const cuisineRestaurants = cuisines.map((item) => ({
      cuisine: item.cuisines,
      restoName: item.name,
      restoAvatar: item.avatar,
      restoId: item._id,
    }));

    res.json(cuisineRestaurants);

    // res.json(cuisines.map((item) => item.cuisines));
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

const getAllRestos = async (req, res) => {
  const restos = await Resto.find();

  res.status(200).json(restos);
};

// Add phone number to a restaurant
const addPhone = async (req, res) => {
  const { restoId, phone } = req.body;

  try {
    const resto = await Resto.findById(restoId);
    if (!resto) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    resto.phone = phone;
    await resto.save();

    res.status(200).json({ message: "Phone number added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete phone number from a restaurant
const deletePhone = async (req, res) => {
  const { restoId } = req.body;

  try {
    const resto = await Resto.findById(restoId);
    if (!resto) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    resto.phone = undefined;
    await resto.save();

    res.status(200).json({ message: "Phone number deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add cuisine to a restaurant
const addCuisine = async (req, res) => {
  console.log("adcuisines");
  const { name } = req.body;
  const image = req.file.filename;
  const restoId = req.query.idR;
  try {
    const resto = await Resto.findByIdAndUpdate(
      restoId,
      {
        $push: {
          cuisines: { image, name },
        },
      },
      { new: true }
    );

    if (!resto) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    res.status(200).json({ message: "Cuisine added successfully", resto });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete cuisine from a restaurant
const deleteCuisine = async (req, res) => {
  const { restoId, cuisineId } = req.body;

  try {
    const resto = await Resto.findById(restoId);
    if (!resto) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const cuisineIndex = resto.cuisines.findIndex(
      (cuisine) => cuisine._id.toString() === cuisineId
    );
    if (cuisineIndex === -1) {
      return res.status(404).json({ message: "Cuisine not found" });
    }

    resto.cuisines.splice(cuisineIndex, 1);
    await resto.save();

    res.status(200).json({ message: "Cuisine deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add description to a restaurant
const addDescription = async (req, res) => {
  const { restoId, description } = req.body;

  try {
    const resto = await Resto.findById(restoId);
    if (!resto) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    resto.description = description;
    await resto.save();

    res.status(200).json({ message: "Description added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
// Delete description from a restaurant
const deleteDescription = async (req, res) => {
  const { restoId } = req.body;

  try {
    const resto = await Resto.findById(restoId);
    if (!resto) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    resto.description = undefined;
    await resto.save();

    res.status(200).json({ message: "Description deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
// ...

// Delete a category from a restaurant's menu
const deleteCategory = async (req, res) => {
  const restoId = req.query.idR;

  const categoryId = req.query.idC;
  console.log("delete cat" + restoId, categoryId);
  try {
    const updatedResto = await Resto.findByIdAndUpdate(
      restoId,
      { $pull: { "menu.categories": { _id: categoryId } } },
      { new: true }
    );

    if (!updatedResto) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete an item from a category in a restaurant's menu
const deleteItem = async (req, res) => {
  const { restoId, categoryId, itemId } = req.body;

  try {
    const updatedResto = await Resto.findByIdAndUpdate(
      restoId,
      { $pull: { "menu.categories.$[category].items": { _id: itemId } } },
      { new: true, arrayFilters: [{ "category._id": categoryId }] }
    );

    if (!updatedResto) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

//recuperer le menu des restos
const getMenuResto = async (req, res) => {
  const restoId = req.query.restoId;
  console.log("laarvi");
  console.log(restoId);
  try {
    const menuResto = await Resto.findById(restoId);

    if (!menuResto) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Récupération du menu du restaurant

    const menu = menuResto.menu;

    res.status(200).json({ menu });
  } catch (error) {
    console.error("Error fetching menu:", error);
    res.status(500).json({ message: "Failed to fetch menu" });
  }
};

//recuperer les photo resto
const getPhotoResto = async (req, res) => {
  const { restoId } = req.query;

  try {
    // Recherche du restaurant par ID
    const resto = await Resto.findById(restoId);

    if (!resto) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Récupération des photos du restaurant
    const photos = resto.photos;

    res.status(200).json({ photos });
  } catch (error) {
    console.error("Error fetching photos:", error);
    res.status(500).json({ message: "Failed to fetch photos" });
  }
};

const getalladminrestos = async (req, res) => {
  try {
    // Retrieve all restaurants
    const restos = await Resto.find().populate("owner", "email");

    return res.status(200).json(restos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
const confirm_resto = async (req, res) => {
  const idResto = req.query.idResto;
  console.log(idResto, "idResto");

  try {
    // Find the restaurant by ID and update the "isConfirmed" field
    const resto = await Resto.findByIdAndUpdate(
      idResto,
      { isConfirmed: true },
      { new: true }
    );

    if (!resto) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    return res.status(200).json({ message: "Restaurant confirmed", resto });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//recupere le commentaire et les publication des utilisateur
///////////////////////for admin
async function getUserCommentsAndPublications(req, res) {
  const idUser = req.query.id;
  console.log("admin pub comments");
  console.log(idUser);
  try {
    // Retrieve user comments and photos from Resto model
    const restaurants = await Resto.find({ "comments.user": idUser })
      .populate("comments.user", "username")
      .select("comments photos");

    const userComments = [];

    restaurants.forEach((restaurant) => {
      restaurant.comments.forEach((com) => {
        console.log(com.user._id);

        if (com.user._id.toString() === idUser) {
          userComments.push({
            comment: com.comment,
            date: com.date,
          });
        }
      });
    });

    res.status(200).json({
      userComments,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to retrieve user comments and photos" });
  }
}

async function getUserPhotos(req, res) {
  console.log("kkkkkkkkkkkkk");
  const idUser = req.query.id;

  try {
    // Retrieve restaurants where the user is the owner
    const restaurants = await Resto.find({ owner: idUser }).select("photos");

    const userPhotos = [];

    restaurants.forEach((restaurant) => {
      userPhotos.push(...restaurant.photos);
    });

    res.status(200).json({ userPhotos });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve user photos" });
  }
}
/////////////////////////////////////////////////////////////////////////////////////

const getcomments = async (req, res) => {
  try {
    const { idR } = req.query;

    const restaurant = await Resto.findById(idR, "comments").populate(
      "comments.user"
    );

    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    res.status(200).json(restaurant.comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Server error" });
  }
};
const addcomments = async (req, res) => {
  try {
    const { idR, userId } = req.query;
    const { comment } = req.body;

    const restaurant = await Resto.findById(idR);

    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    const newComment = {
      user: userId,
      comment: comment,
      date: Date.now(),
    };

    restaurant.comments.push(newComment);
    await restaurant.save();

    res.status(200).json({ message: "Comment added successfully!" });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const updateHours = (req, res) => {
  console.log("33333333333333");
  const restaurantId = req.query.id;
  const openingHours = req.body;

  Resto.findByIdAndUpdate(
    restaurantId,
    { openingHours },
    { new: true },
    (err, updatedResto) => {
      if (err) {
        console.error("Error updating opening hours:", err);
        return res
          .status(500)
          .json({ error: "An error occurred while updating opening hours" });
      }
      res.status(200).json(updatedResto);
    }
  );
};

const isRestaurantOpen = async (req, res) => {
  console.log("check resto openning");

  try {
    const id = req.query.id;
    const resto = await Resto.findById(id);
    //   const currentmoment = moment().tz("Europe/Paris").format("HH:mm:ss");
    const currentmoment = moment().tz("Europe/Paris").format("HH");
    console.log("Current hour in paris (AM/PM format): ", currentmoment);

    const heureinalgeria = currentmoment - 1;
    /*
    const currentmoment = moment().tz("Europe/Paris").format("h A");
    console.log("Current hour in GMT+1 (AM/PM format): ", currentmoment);

    //const numbers = currentmoment.match(/\d+/g).map(Number);

   const number = parseInt(currentmoment.match(/\d+/)[0], 10);
    console.log(number, "numbers");*/

    if (!resto) {
      return res.status(404).json({ error: "Resto not found" });
    }

    const currentHour = new Date().getHours();
    console.log("currentHour", currentHour); // Get the current hour (0-23)
    const options = { timeZone: "Africa/Algiers" };
    const currentDay = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: options.timeZone,
    });
    console.log(currentDay, "day in algeria");

    const openingHoursToday = resto.openingHours.find(
      (hours) => hours.day === currentDay
    );
    console.log(openingHoursToday);
    if (!openingHoursToday) {
      return res.json({ status: "Closed" });
    }

    const openingTime = new Date(
      `June 3, 2023 ${openingHoursToday.startTime}:00`
    );
    const closingTime = new Date(
      `June 3, 2023 ${openingHoursToday.endTime}:00`
    );

    console.log(openingTime.getHours(), "opentime");
    console.log(closingTime.getHours(), "closetime");
    console.log(currentHour, "currentime");

    if (
      heureinalgeria >= openingTime.getHours() &&
      heureinalgeria <= closingTime.getHours()
    ) {
      /*{
      return res.json({ status: "Open" });
    } else {
      return res.json({ status: "Closed" });
    }*/
      const closingMoment = moment(closingTime).format("h:mm A");
      return res.json({
        status: "Open",
        closingTime: openingHoursToday.endTime,
      });
    } else {
      const openingMoment = moment(openingTime).format("h:mm A");
      return res.json({
        status: "Closed",
        openingTime: openingHoursToday.startTime,
      });
    }
  } catch (error) {
    console.error("Error retrieving opening hours:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
const updatedetailsResto = async (req, res) => {
  try {
    const { id } = req.query; // Assuming you pass the restaurant ID as a query parameter
    console.log(id, "id resto");

    // Retrieve the restaurant details
    const resto = await Resto.findById(id);

    if (!resto) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Update the restaurant details
    resto.name = req.body.name || resto.name;
    resto.phone = req.body.phone || resto.phone;
    resto.description = req.body.description || resto.description;
    resto.avatar = req.file ? req.file.path : resto.avatar;

    // Save the updated restaurant
    const updatedResto = await resto.save();

    res.json(updatedResto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating restaurant details" });
  }
};

const deleteResto = async (req, res) => {
  console.log("supression du restorant");
  const restoId = req.query.idR;

  try {
    // Delete the restaurant from all other references
    await User.updateMany({ $pull: { followers: restoId } });
    await Reserve.updateMany({ $pull: { resto: restoId } });

    // Delete the restaurant
    await Resto.findByIdAndDelete(restoId);

    res.status(200).json({ message: "Restaurant deleted successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the restaurant" });
  }
};
module.exports = {
  getalladminrestos,
  confirm_resto,
  getUserPhotos,
  deleteResto,
  updatedetailsResto,
  isRestaurantOpen,
  updateHours,
  addcomments,
  getcomments,
  deleteCategory,
  deleteItem,
  addPhone,
  deletePhone,
  addCuisine,
  deleteCuisine,
  addDescription,
  deleteDescription,
  randomCuisines,
  recentsRestos,
  getAllRestos,
  topRestos,
  homePub,
  unfollow,
  follow,
  handlefindresto,
  handlenewresto,
  handledeleteteresto,
  handleupdateresto,
  handlegetresto,
  getMenuResto,
  getPhotoResto,
  getUserCommentsAndPublications,
};
