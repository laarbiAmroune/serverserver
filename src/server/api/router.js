const express = require("express");
const Resto = require("../db/Schema/Restaurant");
const User = require("../db/Schema/User");
const upload = require("../middleware/upload");
const jwt = require("jsonwebtoken");
const secretKey = "khlifa";
const handleSearch = require("../controller/moteur");
const {
  addmessage,
  getAllMessages,
} = require("../controller/messgesController");
const {
  homeLogique,
  getUserSubscribedRestaurantsPhotos,
} = require("../controller/homeLogique");
const {
  handleNewUser,
  handlegetuser,
  handleupdateuser,
  authUser,
  handledeleteteuser,
  authAdmin,
  getAllUsers,
  handleValidateEmail,
} = require("../controller/userController");
const {
  handledeleteteresto,
  getalladminrestos,
  confirm_resto,
  deleteResto,
  isRestaurantOpen,
  updateHours,
  getcomments,
  addcomments,
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
  topRestos,
  homePub,
  unfollow,
  follow,
  handlefindresto,
  handlenewresto,
  handleupdateresto,
  handlegetresto,
  getAllRestos,
  getMenuResto,
  getPhotoResto,
  updatedetailsResto,
  getUserCommentsAndPublications,
  getUserPhotos,
} = require("../controller/restoController");
const {
  handleaddmenu,
  handleaddcategory,
  handlereadcategory,
  handleadditem,
  addmenuitem,

  deleteitems,
} = require("../controller/menuController");
const {
  newReservation,
  removeReservation,
  acceptReservation,
  rejectReservation,
} = require("../controller/reserveController");
const app = express();
const fs = require("fs");
const multer = require("multer");
app.post("/upload", upload.single("image"), handlenewresto);
app.get("/ProfilResto", handlegetresto);
app.post("/searchResto", handlefindresto);
app.post("/search", handleSearch);
app.post("/homeLogique", homeLogique);
app.post(
  "/getUserSubscribedRestaurantsPhotos",
  getUserSubscribedRestaurantsPhotos
);

////////////////////////////////////////

app.post("/getAllMessages", getAllMessages);
app.post("/addmessage", addmessage);
app.post("/admin-page", authAdmin);
//////////////////////
app.post("/newReservation", newReservation);
app.put("/acceptReservation", acceptReservation);
app.put("/rejectReservation", rejectReservation);
/////////////////
app.post("/addfollower", follow);
app.post("/unfollow", unfollow);
app.post("/signup", upload.single("image"), handleNewUser);
app.get("/confirmation/:id", handleValidateEmail);
app.post("/login", authUser);

app.get("/profile", handlegetuser);

app.post("/updateprofil", handleupdateuser);
app.post("/deleteprofil", handledeleteteuser);
app.post("/updateresto", upload.single("photos"), handleupdateresto);

app.post("/addmenu", handleaddmenu);
app.post("/addcategory", handleaddcategory);
app.get("/category", handlereadcategory);

app.post("/additem", addmenuitem);
/////////////////////////////////////////////////////
app.post("/deleteCategory", deleteCategory);
app.post("/deleteItems", deleteItem);
app.post("/addPhone ", addPhone);
app.post("/deletePhone ", deletePhone);
app.post("/addCuisine", upload.single("image"), addCuisine);
app.post("/deleteCuisine ", deleteCuisine);
app.post("/addDescription ", addDescription);
app.post("/deleteDescription ", deleteDescription);

//////////////////////////////////////////////////////

app.get("/top-restaurants", topRestos);
app.get("/recents-restaurants", recentsRestos);
app.get("/homePub", homePub);
//recuperer les utilisateurs pour l'admin
app.get("/admin_users", getAllUsers);

//recuperer les restaurant pour l'admin
app.get("/admin_resto", getAllRestos);
//recents-restaurants
app.get("/random-cuisines", randomCuisines);

//recuperer les detail resto
// app.get("/getDetailResto", getDetailResto);

//recuperer le menu des restos
app.get("/getMenuResto", getMenuResto);

//recuperer les photo resto
app.get("/getPhotoResto", getPhotoResto),
  app.post("/updatedetailsResto", upload.single("image"), updatedetailsResto);
app.post("/addcomments", addcomments);
app.get("/getcomments", getcomments);

// DELETE route to delete multiple items
app.delete("/deleteitems", deleteitems);

app.post("/updateHours", updateHours);

app.get("/isRestaurantOpen", isRestaurantOpen);
// DELETE /resto/:id
app.delete("/deleteResto", handledeleteteresto);
app.post("/getUserCommentsAndPublications", getUserCommentsAndPublications);
app.post("/getUserPhotos", getUserPhotos);
app.post("/confirm_resto", confirm_resto);
app.get("/getalladminrestos", getalladminrestos);
/*
app.post("/addResto", upload.single("avatar"), async (req, response) => {
  const resto = new Resto(req.body);
  console.log(resto);
  if (req.file) {
    resto.avatar = req.file.path;
    console.log(resto.avatar);
  }

  try {
    await resto.save();
    response.send(resto);
  } catch (error) {
    response.status(500).send(error);
  }
});

app.get("/Resto", async (request, response) => {
  const resto = await Resto.find({});

  try {
    response.send(resto);
  } catch (error) {
    response.status(500).send(error);
  }
});*/
module.exports = app;
