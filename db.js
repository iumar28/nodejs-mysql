const mysql = require('mysql');

const db = mysql.createConnection({
  host: "localhost",
  user: 'root',
  password: '1234',
  database: 'customerdata' 
});

db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('mysql connected');
});

module.exports = db;
