const mysql = require('mysql');
const db = mysql.createConnection({
    host: "localhost",
    user: 'root',
    password: '1234',
    database: 'customerdata' // Change the database name to 'customerdata'
  });

function getCustomerData(req,res) {
    let sql = 'SELECT * FROM customer_data';
  db.query(sql, (err, result) => {
    if (err) {
      throw err;
    }
    console.log(result);
    res.json(result); // Send the data as JSON response
  });
}

module.exports = {getCustomerData}