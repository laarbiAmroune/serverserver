const { default: mongoose } = require("mongoose");

const User = require("../db/Schema/User");
const Resto = require("../db/Schema/Restaurant");
const session = require("express-session");
const generateToken = require("../config/generateToken");
const asyncHandler = require("express-async-handler");

const handleSearch = asyncHandler(async (req, res) => {
  const keyword = req.query.keyword;
  console.log(keyword);
  // Function to extract numbers from the keyword
  const extractNumbers = (str) => {
    const regex = /\d+/g;
    const matches = str.match(regex);
    return matches ? matches.map(Number) : [];
  };

  // const characters = keyword.match(/[a-zA-Z]+/g);
  const characters = keyword.match(/[a-zA-ZÉéèêëÀâäÆæÇçÎïôœÙûüŸÿ]+/g);
  console.log("char:", characters ? characters[0] : null);

  const KeywordText = characters ? characters[0] : keyword;
  console.log("KeywordText:", KeywordText);

  //////////////works butnot perfect
  /* const characters = keyword.match(/[a-zA-Z]+/g);
  console.log("char:", characters[0]);
  const KeywordText = characters[0];*/

  ////////////////////////////////
  // ['ABC', 'DEF']

  // const characters = [...keyword];

  // Perform a search using regular expressions
  /* const regexPattern = /[a-zA-Z]/g;
  const matchedCharacters = characters.filter((char) =>
    char.match(regexPattern)
  );
*/
  // Print the matched characters
  // console.log("matchedCharacters", matchedCharacters);
  //////////////////////////////////////////////////////////////
  try {
    // Recherche des restaurants, items et catégories qui correspondent à la requête de recherche
    Resto.find(
      {
        $and: [
          {
            $or: [
              { name: { $regex: KeywordText, $options: "i" } },
              { address: { $regex: KeywordText, $options: "i" } },
              { "menu.name": { $regex: KeywordText, $options: "i" } },
              {
                "menu.categories.name": { $regex: KeywordText, $options: "i" },
              },
              {
                "menu.categories.items.name": {
                  $regex: KeywordText,
                  $options: "i",
                },
              },
              {
                "menu.categories.items.description": {
                  $regex: KeywordText,
                  $options: "i",
                },
              },
              { description: { $regex: KeywordText, $options: "i" } },
              { "cuisines.name": { $regex: KeywordText, $options: "i" } },
            ],
          },
          { isConfirmed: true }, // Filter out non-confirmed restaurants
        ],
      },
      "_id name menu avatar cuisines  price_average address description",
      async (err, results) => {
        // Filtrer les résultats par type
        const restoResults = results.filter(
          (result) =>
            result.name.toLowerCase().includes(KeywordText.toLowerCase()) ||
            result.address.toLowerCase().includes(KeywordText.toLowerCase())
        );

        const lowPriceResto = [];
        const mediumPriceResto = [];
        const highPriceResto = [];
        const suphighPriceResto = [];

        restoResults.forEach((result) => {
          if (result.price_average >= 0 && result.price_average < 100) {
            lowPriceResto.push(result);
          } else if (
            result.price_average >= 100 &&
            result.price_average < 1000
          ) {
            mediumPriceResto.push(result);
          } else if (
            result.price_average >= 1000 &&
            result.price_average < 10000
          ) {
            highPriceResto.push(result);
          } else if (result.price_average >= 10000) {
            suphighPriceResto.push(result);
          }
        });
        /*
        const categoryResults = results.reduce((categories, result) => {
          const matchingCategories = result.menu.categories.filter((category) =>
            category.name.toLowerCase().includes(KeywordText.toLowerCase())
          );
          return categories.concat(
            matchingCategories.map((category) => category.name)
          );
        }, []);*/

        const categoryResults = results.reduce((categories, result) => {
          const matchingCategories = result.menu.categories.filter((category) =>
            category.name.toLowerCase().includes(KeywordText.toLowerCase())
          );
          const categoriesWithRestoInfo = matchingCategories.map(
            (category) => ({
              categoryId: category._id,
              name: category.name,
              restaurantId: result._id,
              restoAvatar: result.avatar,
              restoName: result.name,
              items: category.items,
            })
          );
          return categories.concat(categoriesWithRestoInfo);
        }, []);

        const itemResults = results.reduce((items, result) => {
          const matchingItems = result.menu.categories.reduce(
            (items, category) => {
              if (category.name.toLowerCase() === "plats") {
                const matchingCategoryItems = category.items.filter((item) =>
                  item.name.toLowerCase().includes(KeywordText.toLowerCase())
                );
                return items.concat(
                  matchingCategoryItems.map((item) => ({
                    itemId: item._id,
                    itemImage: item.image,
                    itemPrice: item.price,
                    itemDescription: item.description,
                    itemName: item.name,
                    restaurantId: result._id,
                    restoAvatar: result.avatar,
                    restoName: result.name,
                  }))
                );
              }
              return items;
            },
            []
          );
          return items.concat(matchingItems);
        }, []);

        /* const itemResults = results.reduce((items, result) => {
        const matchingItems = result.menu.categories.reduce(
          (items, category) => {
            const matchingCategoryItems = category.items.filter((item) =>
              item.name.toLowerCase().includes(KeywordText.toLowerCase())
            );
            return items.concat(matchingCategoryItems);
          },
          []
        );
        return items.concat(matchingItems);
      }, []);*/
        console.log(results);

        const cuisineResults = results.reduce((cuisines, result) => {
          const matchingCuisines = result.cuisines.filter((cuisine) =>
            cuisine.name.toLowerCase().includes(KeywordText.toLowerCase())
          );
          return cuisines.concat(
            matchingCuisines.map((cuisine) => ({
              cuisineImage: cuisine.image,
              cuisineName: cuisine.name,
              restaurantId: result._id,
              restoAvatar: result.avatar,
              restoName: result.name,
            }))
          );
        }, []);

        console.log(itemResults);
        console.log(categoryResults);
        console.log(cuisineResults);

        //////////////////////////////////////////////////////////

        /* const numericValues = extractNumbers(keyword);
        if (numericValues.length > 0) {
          const numericResults = await Resto.find(
            { "menu.categories.items.price": { $in: numericValues } },
            "_id name menu avatar cuisines price_average address"
          );

          const foundItems = [];
          numericResults.forEach((result) => {
            result.menu.categories.forEach((category) => {
              category.items.forEach((item) => {
                if (numericValues.includes(item.price)) {
                  foundItems.push({
                    itemName: item.name,
                    itemId: item._id,
                    itemPrice: item.price,
                    itemDescription: item.description,
                    restaurantName: result.name,
                    restaurantPhoto: result.avatar,
                    restaurantId: result._id,
                  });
                }
              });
            });
          });

          */
        const numericValues = extractNumbers(keyword);
        if (numericValues.length > 0) {
          const numericResults = await Resto.find(
            {
              "menu.categories.name": { $regex: /plats/i },
              "menu.categories.items.price": { $in: numericValues },
            },
            "_id name menu.avatar menu.categories"
          );

          const foundItems = [];
          numericResults.forEach((result) => {
            const platsCategory = result.menu.categories.find(
              (category) => category.name.toLowerCase() === "plats"
            );
            if (platsCategory) {
              const matchingItems = platsCategory.items.filter((item) =>
                numericValues.includes(item.price)
              );
              matchingItems.forEach((item) => {
                foundItems.push({
                  itemName: item.name,
                  itemId: item._id,
                  itemPrice: item.price,
                  itemDescription: item.description,
                  restaurantName: result.name,
                  restaurantPhoto: result.menu.avatar,
                  restaurantId: result._id,
                });
              });
            }
          });

          res.send({
            itemResults: itemResults,
            restoResults: restoResults,
            categoryResults: categoryResults,
            cuisineResults: cuisineResults,
            lowPriceResto: lowPriceResto,
            mediumPriceResto: mediumPriceResto,
            highPriceResto: highPriceResto,
            suphighPriceResto: suphighPriceResto,
            numericResults: foundItems,
          });

          console.log("numericfoundItems", foundItems);
        } else {
          res.send({
            itemResults: itemResults,
            restoResults: restoResults,
            categoryResults: categoryResults,
            cuisineResults: cuisineResults,
            lowPriceResto: lowPriceResto,
            mediumPriceResto: mediumPriceResto,
            highPriceResto: highPriceResto,
            suphighPriceResto: suphighPriceResto,
          });
        }
      }
    );

    //////////////////////////////////////////////////////////////////////

    /*  res.send({
          itemResults: itemResults,
          restoResults: restoResults,
          categoryResults: categoryResults,
          cuisineResults: cuisineResults,

          lowPriceResto: lowPriceResto,
          mediumPriceResto: mediumPriceResto,
          highPriceResto: highPriceResto,
        });
      }
    );*/
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
  // Vérifier le type de résultats correspondants
  /* if (restoResults.length > 0) {
          res.send(restoResults);
        } else if (categoryResults.length > 0) {
          res.send(categoryResults[0].menu.categories);
        } else if (itemResults.length > 0) {
          res.send(
            itemResults[0].menu.categories.flatMap((category) =>
              category.items.filter((item) =>
                item.name.toLowerCase().includes(KeywordText.toLowerCase())
              )
            )
          );
        } else {
          res.send([]);
        }*/
});
module.exports = handleSearch;
