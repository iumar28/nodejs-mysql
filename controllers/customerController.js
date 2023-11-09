const db = require('../db');
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

function registerCustomer(req, res) {
  const {
    customer_id,
    first_name,
    last_name,
    age,
    monthly_salary,
    phone_number,
  } = req.body;

  const approved_limit = Math.round(36 * (monthly_salary / 100000));

  const customerData = {
    customer_id,
    first_name,
    last_name,
    age,
    monthly_salary,
    approved_limit,
    phone_number,
  };

  db.query('INSERT INTO customer_data SET ?', customerData, (err, result) => {
    if (err) {
      throw err;
    }
    console.log('Customer added to the database');
    const name = `${first_name} ${last_name}`;
    res.json({
      customer_id,
      name,
      age,
      monthly_salary,
      approved_limit,
      phone_number,
    });
  });
}

module.exports = {getCustomerData, registerCustomer}