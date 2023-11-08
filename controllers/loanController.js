const mysql = require('mysql');
const db = mysql.createConnection({
    host: "localhost",
    user: 'root',
    password: '1234',
    database: 'customerdata' // Change the database name to 'customerdata'
  });
  

  function viewLoanDetails(req, res) {
    
  const loanId = req.params.loan_id;
  const query = `
    SELECT
      loan_id,
      customer_id,
      loan_amount,
      interest_rate,
      tenure
    FROM loan_data
    WHERE loan_id = ?
  `;

  db.query(query, [loanId], (err, result) => {
    if (err) {
      console.error('Error fetching loan details:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      if (result.length === 0) {
        res.status(404).json({ error: 'Loan not found' });
      } else {
        const loanDetails = result[0];

        const customerQuery = `
          SELECT
            customer_id,
            first_name,
            last_name,
            phone_number,
            age
          FROM customer_data
          WHERE customer_id = ?
        `;

        db.query(customerQuery, [loanDetails.customer_id], (err, customerResult) => {
          if (err) {
            console.error('Error fetching customer details:', err);
            res.status(500).json({ error: 'Internal Server Error' });
          } else {
            if (customerResult.length === 0) {
              res.status(404).json({ error: 'Customer not found' });
            } else {
              const customerDetails = customerResult[0];

              // Create the response body
              const responseBody = {
                loan_id: loanDetails.loan_id,
                customer: {
                  id: customerDetails.customer_id,
                  first_name: customerDetails.first_name,
                  last_name: customerDetails.last_name,
                  phone_number: customerDetails.phone_number,
                  age: customerDetails.age,
                },
                loan_amount: loanDetails.loan_amount,
                interest_rate: loanDetails.interest_rate,
                monthly_installment: calculateMonthlyPayment(loanDetails.loan_amount, loanDetails.interest_rate, loanDetails.tenure),
                tenure: loanDetails.tenure,
              };

              res.json(responseBody);
            }
          }
        });
      }
    }
  });
  }

function calculateMonthlyPayment(amountPaid, interest_rate, tenure) {
    // Ensure that amountPaid is a valid number and greater than 0
    if (isNaN(amountPaid) || amountPaid <= 0) {
      throw new Error('Invalid amountPaid value');
    }
  
    // Ensure that interest_rate and tenure are valid numbers
    if (isNaN(interest_rate) || isNaN(tenure)) {
      throw new Error('Invalid interest_rate or tenure value');
    }
  
    // Check for division by zero
    if (interest_rate === 0 || tenure === 0) {
      throw new Error('Interest rate and tenure must be greater than zero');
    }
  
    // Calculate the new monthly payment
    const monthlyInterestRate = interest_rate / 12 / 100; // Convert annual interest rate to monthly and percentage to decimal
    const denominator = Math.pow(1 + monthlyInterestRate, tenure) - 1;
    const newMonthlyPayment = (amountPaid * monthlyInterestRate) / denominator;
  
    return newMonthlyPayment;
  }
  
function makePayment(req, res) {
    const customer_id = req.params.customer_id;
    const loan_id = req.params.loan_id;
    const { amountPaid } = req.body; 
  
    const loanQuery = `
      SELECT
        *
      FROM loan_data
      WHERE customer_id = ? AND loan_id = ?
    `;
  
    db.query(loanQuery, [customer_id, loan_id], (err, loanResult) => {
      if (err) {
        console.error('Error fetching loan details:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        if (loanResult.length === 0) {
          res.status(404).json({ error: 'Loan not found' });
        } else {
          const loanDetails = loanResult[0];
          console.log(`loandetails`,loanDetails);
          const {interest_rate, tenure, monthly_payment,emi_paid_on_time } = loanDetails;
          console.log(loanDetails);
  
          
          let newMonthlyPayment=monthly_payment;
          if(amountPaid<monthly_payment){
            newMonthlyPayment = calculateMonthlyPayment(amountPaid, interest_rate, tenure);
            console.log(`newmonthlypayment`, newMonthlyPayment);
          }
          let new_emipaidontime=emi_paid_on_time+1;
  
          const updateQuery = `UPDATE loan_data SET emi_paid_on_time = ?, monthly_payment = ? WHERE customer_id = ? AND loan_id = ?
`;

  
          db.query(updateQuery, [new_emipaidontime,monthly_payment, customer_id, loan_id], (err) => {
            if (err) {
              console.error('Error updating monthly payment:', err);
              res.status(500).json({ error: 'Internal Server Error' });
            } else {
              res.json({ message: 'Payment successfully made' });
            }
          });
        }
      }
    });
  }
  
  function calculateMonthlyPayment(amountPaid, interest_rate, tenure) {
    const monthlyInterestRate = interest_rate / 12 / 100; // Convert annual interest rate to monthly and 
  
    const numerator = amountPaid * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, tenure));
    const denominator = Math.pow(1 + monthlyInterestRate, tenure) - 1;
    const newMonthlyPayment = numerator / denominator;
  
    return newMonthlyPayment;
  }
  
module.exports = {
  viewLoanDetails,
  makePayment
};
