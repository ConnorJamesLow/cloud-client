const express = require('express');
const app = express();

app.use(express.static('client'));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const port = 8081;

app.listen(port, function () {
  console.log(`Example app listening on port ${port}!`);
});
