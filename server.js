const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const loanController = require('./controllers/loanController');
const customerController = require('./controllers/customerController');
const db = mysql.createConnection({
  host: "localhost",
  user: 'root',
  password: '1234',
  database: 'customerdata' // Change the database name to 'customerdata'
});

db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('mysql connected');
});

const app = express();
app.use(bodyParser.json());
app.post('/make-payment/:customer_id/:loan_id', loanController.makePayment);
app.get('/view-loan/:loan_id', loanController.viewLoanDetails);
app.get('/getcustomerdata',customerController.getCustomerData);
app.post('/register', (req, res) => {
  const {
    customer_id,
    first_name,
    last_name,
    age,
    monthly_salary,
    phone_number,
  } = req.body;

  // Calculate the approved credit limit
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

  // Insert the customer data into the 'customer_data' table
  db.query('INSERT INTO customer_data SET ?', customerData, (err, result) => {
    if (err) {
      throw err;
    }
    console.log('Customer added to the database');
    const customer_id = result.insertId;
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
});

app.post('/check-eligibility',(req,res)=>{
  const { customer_id, loan_amount, interest_rate, tenure } = req.body;
  // const creditScore = calculateCreditScore(customer_id);
  const creditScore = 50;
  // const temp = calculateCreditScore(270);
  let temp;

async function getAndSetCreditScore() {
  try {
    temp = await calculateCreditScore(221);
  } catch (error) {
    console.error('Error:', error);
  }
}

getAndSetCreditScore()
  .then(() => {
    console.log('Credit Score:', temp);
  });


  // Check if the sum of all current EMIs is greater than 50% of monthly salary
  const sumCurrentEMIs = calculateSumCurrentEMIs(customer_id);
  const monthlySalary = getMonthlySalary(customer_id);

  // Determine loan eligibility and interest rate
  let approval = false;
  let correctedInterestRate = interest_rate;
  if (creditScore > 50) {
    approval = true;
  } else if (creditScore > 30) {
    if (interest_rate > 12) {
      correctedInterestRate = 12;
    }
    approval = true;
  } else if (creditScore > 10) {
    if (interest_rate > 16) {
      correctedInterestRate = 16;
    }
    approval = true;
  }

  if (sumCurrentEMIs > 0.5 * monthlySalary) {
    approval = false;
  }

  const monthlyInstallment = calculateMonthlyInstallment(loan_amount, correctedInterestRate, tenure);

  const response = {
    temp,
    customer_id,
    approval,
    interest_rate,
    corrected_interest_rate: correctedInterestRate,
    tenure,
    monthly_installment: monthlyInstallment,
  };

  res.json(response);

})
async function getLoanHistory(customer_id) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM loan_data WHERE customer_id = ?';
    db.query(sql, [customer_id], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}


async function calculateCreditScore(customer_id) {
  try {
    const loanHistory = await getLoanHistory(customer_id);

    // Initialize variables to calculate the components
    let paidOnTimePercentage = 0;
    let numberOfLoans = 0;
    let currentYearLoanActivity = 0;
    let approvedLoanVolume = 0;
    let sumCurrentLoans = 0;

    // Calculate components based on loan history
    for (const loan of loanHistory) {
      // 1. Past Loans Paid on Time
      if (loan.emi_paid_on_time) {
        paidOnTimePercentage++;
      }

      // 2. Number of Loans Taken in the Past
      numberOfLoans++;

      // 3. Loan Activity in the Current Year
      const loanYear = new Date(loan.start_date).getFullYear();
      const currentYear = new Date().getFullYear();
      if (loanYear === currentYear) {
        currentYearLoanActivity++;
      }

      // 4. Loan Approved Volume
      approvedLoanVolume += loan.loan_amount;

      // 5. Sum of Current Loans
      if (loan.end_date >= new Date()) {
        sumCurrentLoans += loan.monthly_payment;
      }
    }

    // Define weights for each component
    const weightPaidOnTime = 0.2;
    const weightNumberOfLoans = 0.1;
    const weightCurrentYearLoanActivity = 0.2;
    const weightApprovedLoanVolume = 0.3;

    // Calculate credit score based on the components
    let creditScore = 0;

    // Calculate credit score based on weights and thresholds
    creditScore =
      (paidOnTimePercentage / numberOfLoans) * weightPaidOnTime * 100 +
      (numberOfLoans / 10) * weightNumberOfLoans * 10 +
      (currentYearLoanActivity / numberOfLoans) * weightCurrentYearLoanActivity * 100 +
      (approvedLoanVolume / 1000) * weightApprovedLoanVolume * 10 +
      (sumCurrentLoans / (0.5 * getMonthlySalary(customer_id))) * 10;

    // Ensure credit score is within the 0-100 range
    creditScore = Math.min(100, Math.max(0, creditScore));

    return creditScore;
  } catch (err) {
    throw err;
  }
}


async function calculateSumCurrentEMIs(customer_id) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT SUM(monthly_payment) as totalEmi FROM loan_data WHERE customer_id = ? AND end_date >= CURDATE()';
    db.query(sql, [customer_id], (err, result) => {
      if (err) {
        reject(err);
      } else {
        // Extract the total EMI sum from the result
        const totalEmi = result[0].totalEmi || 0;
        resolve(totalEmi);
      }
    });
  });
}

async function getMonthlySalary(customer_id) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT monthly_salary FROM customer_data WHERE customer_id = ?';
    db.query(sql, [customer_id], (err, result) => {
      if (err) {
        reject(err);
      } else {
        // Extract the monthly salary from the result
        const monthlySalary = result[0].monthly_salary || 0;
        resolve(monthlySalary);
      }
    });
  });
}

function calculateMonthlyInstallment(loan_amount, interest_rate, tenure) {
  const monthlyInterestRate = interest_rate / 12;
  const base = 1 + monthlyInterestRate;
  const numerator = loan_amount * monthlyInterestRate * Math.pow(base, tenure);
  const denominator = Math.pow(base, tenure) - 1;
  const monthly_installment = numerator / denominator;
  return monthly_installment;
}


app.listen(3000, () => {
  console.log('server started at 3000');
});
