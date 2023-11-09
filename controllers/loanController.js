
const {
  calculateSumCurrentEMIs,
  getMonthlySalary,
  calculateMonthlyInstallment,
  calculateCreditScore
} = require('./helpers');
const db = require('../db');
  

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
    if (isNaN(amountPaid) || amountPaid <= 0) {
      throw new Error('Invalid amountPaid value');
    }
  
    if (isNaN(interest_rate) || isNaN(tenure)) {
      throw new Error('Invalid interest_rate or tenure value');
    }
  
    if (interest_rate === 0 || tenure === 0) {
      throw new Error('Interest rate and tenure must be greater than zero');
    }
  
    const monthlyInterestRate = interest_rate / 12 / 100; 
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
          const {interest_rate, tenure, monthly_payment,emi_paid_on_time } = loanDetails;
  
          
          let newMonthlyPayment=monthly_payment;
          if(amountPaid<monthly_payment){
            newMonthlyPayment = calculateMonthlyPayment(amountPaid, interest_rate, tenure);
          }
          let new_emipaidontime=emi_paid_on_time+1;
  
          const updateQuery = `UPDATE loan_data SET emi_paid_on_time = ?, monthly_payment = ? WHERE customer_id = ? AND loan_id = ?`;

  
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
    const monthlyInterestRate = interest_rate / 12 / 100;
  
    const numerator = amountPaid * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, tenure));
    const denominator = Math.pow(1 + monthlyInterestRate, tenure) - 1;
    const newMonthlyPayment = numerator / denominator;
  
    return newMonthlyPayment;
 }

 async function checkEligiblity (req, res) {
  
  const { customer_id, loan_amount, interest_rate, tenure } = req.body;

  try {
    const creditScore = await calculateCreditScore(customer_id);

    const sumCurrentEMIs = await calculateSumCurrentEMIs(customer_id);
    const monthlySalary = await getMonthlySalary(customer_id);

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
      creditScore,
      customer_id,
      approval,
      interest_rate,
      corrected_interest_rate: correctedInterestRate,
      tenure,
      monthly_installment: monthlyInstallment,
    };

    res.json(response);
  } catch (error) {
    console.error("Error in checkEligibility:", error);
    res.status(500).json({ error: "An error occurred while processing the request." });
  }
 }

 function viewStatement(req, res) {
  const customer_id = req.params.customer_id;
  const loan_id = req.params.loan_id;

  const statementQuery = `
    SELECT
      customer_id,
      loan_id,
      loan_amount,
      interest_rate,
      monthly_payment,
      emi_paid_on_time
    FROM loan_data
    WHERE customer_id = ? AND loan_id = ?
  `;

  db.query(statementQuery, [customer_id, loan_id], (err, statementResult) => {
    if (err) {
      console.error('Error fetching statement details:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      if (statementResult.length === 0) {
        res.status(404).json({ error: 'Loan statement not found' });
      } else {
        const statement = statementResult[0];
        
        const amountPaid = (statement.emi_paid_on_time * statement.monthly_payment);
        const repayments_left = Math.ceil((statement.loan_amount - amountPaid) / statement.monthly_payment);
        
        statement.amountPaid = amountPaid;
        statement.repayments_left = repayments_left;

        res.json(statement);
      }
    }
  });
}


module.exports = {
  viewLoanDetails,
  makePayment,
  checkEligiblity,
  viewStatement
};
