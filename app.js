// Importing necessary modules and files
const airlineNames= require('./airline-name');
const stateCodes =require('./state-code')
const express = require('express');
require('dotenv').config() // for .env file
const Amadeus = require('amadeus');
const bodyParser = require('body-parser')
const cors = require("cors")
const app = express();
const PORT = 5000;

// Setting up CORS and body-parser middleware
app.use(cors({
  origin: 'http://localhost:4200' // Allow requests from this origin
}));
app.use(bodyParser.json())

// Setting up static file directory and view engine
app.use(express.static('public'))
app.set('view engine', 'ejs');

// Helper function to get airline name from carrier code
function getAirlineName(carrierCode) {
  const airline = airlineNames.find(a => a.iata === carrierCode && a.active === 'Y');
  return airline ? airline.name : carrierCode;
}

// Helper function to get city name from state name
function getCityName(stateName) {
  const cityName = stateCodes.find(
    name => name.city_name.toUpperCase() === stateName.toUpperCase()
  );
  if (!cityName) {
    console.log(`City not found for state: ${stateName}`);
    return null;
  }
  console.log(cityName.IATA_code);
  return cityName.IATA_code;
}

// Creating Amadeus instance
const amadeus = new Amadeus({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
});

// Route for homepage
app.get("/",(req,res)=>{
  res.render("index")
})

// Route for flight search
app.get(`/flight-search`, (req, res) => {

  // Extracting query parameters from request
  const originState = req.query.originCode
  const destinationState = req.query.destinationCode
  const dateOfDeparture = req.query.dateOfDeparture;

  // Converting state names to city codes using helper function
  const originCode = getCityName(originState);
  const destinationCode = getCityName(destinationState);

  // Checking if origin and destination codes are valid
  if (!originCode || !destinationCode) {
    res.status(400).send("Invalid origin or destination code? Try with  iata_code");
    return;
  }

  // Making API call to Amadeus to search for flight offers
  amadeus.shopping.flightOffersSearch.get({
    originLocationCode: originCode,
    destinationLocationCode: destinationCode,
    departureDate: dateOfDeparture,
    adults: '1',
    max: '20',
    currencyCode: 'INR'
  })
  .then(function (response) {
    // Extracting flight offers from response
    const flightOffers = response.result.data;
    // Extracting necessary data from each offer and creating a new array of objects
    const offers = flightOffers.map(offer => {
      const carrierCode = offer.itineraries[0].segments[0].carrierCode;
      const airlineName =getAirlineName(carrierCode)
      const price = `₹${offer.price.total}`;
      return { airlineName, price };
    });
    // Sending the array of flight offers as response
    res.send(offers);
  })
  .catch(function (response) {
    // Sending error response if there's an error in API call
    res.send(response);
  });
});

// Starting the server
app.listen(PORT, () =>
  console.log(`Server is running on port: http://localhost:${PORT}`)
);


// http://localhost:5000/flight-search?originCode=DEL&destinationCode=JAI&dateOfDeparture=2023-05-20