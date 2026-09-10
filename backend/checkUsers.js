const mongoose = require('mongoose');
const models = require('./models/models');

console.log("Registered Mongoose Model Names:");
console.log(mongoose.modelNames());
process.exit(0);
