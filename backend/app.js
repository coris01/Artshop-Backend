const express = require("express");
const app = express();
const errorMiddleware = require("./middleware/error")
const cookieParser = require("cookie-parser");

//config
if (process.env.NODE_ENV!=="PRODUCTION"){
    require("dotenv").config({path: "backend/config/config.env"}); 
}

app.use(express.json())
app.use(cookieParser());

//Route Imports
const product = require("./routes/productRoute");
const user = require("./routes/userRoute");

app.use("/api/v1", product);
app.use("/api/v1", user);

//Middleware for Errors
app.use(errorMiddleware);


module.exports = app;   

//1:09:06