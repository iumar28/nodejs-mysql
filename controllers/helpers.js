const db = require('../db');
async function calculateSumCurrentEMIs(customer_id) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT SUM(monthly_payment) as totalEmi FROM loan_data WHERE customer_id = ? AND end_date >= CURDATE()';
    db.query(sql, [customer_id], (err, result) => {
      if (err) {
        reject(err);
      } else {
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
    let paidOnTimePercentage = 0;
    let numberOfLoans = 0;
    let currentYearLoanActivity = 0;
    let approvedLoanVolume = 0;
    let sumCurrentLoans = 0;

    for (const loan of loanHistory) {
      if (loan.emi_paid_on_time) {
        paidOnTimePercentage++;
      }

      numberOfLoans++;

      const loanYear = new Date(loan.start_date).getFullYear();
      const currentYear = new Date().getFullYear();
      if (loanYear === currentYear) {
        currentYearLoanActivity++;
      }

      approvedLoanVolume += loan.loan_amount;

      if (loan.end_date >= new Date()) {
        sumCurrentLoans += loan.monthly_payment;
      }
    }
    const weightPaidOnTime = 0.2;
    const weightNumberOfLoans = 0.1;
    const weightCurrentYearLoanActivity = 0.2;
    const weightApprovedLoanVolume = 0.3;

    let creditScore = 0;

    creditScore =
      (paidOnTimePercentage / numberOfLoans) * weightPaidOnTime * 100 +
      (numberOfLoans / 10) * weightNumberOfLoans * 10 +
      (currentYearLoanActivity / numberOfLoans) * weightCurrentYearLoanActivity * 100 +
      (approvedLoanVolume / 1000) * weightApprovedLoanVolume * 10 +
      (sumCurrentLoans / (0.5 )) * 10;

    creditScore = Math.min(100, Math.max(0, creditScore));

    return creditScore;
  } catch (err) {
    throw err;
  }
}  

module.exports = {calculateSumCurrentEMIs, getMonthlySalary, calculateMonthlyInstallment, getLoanHistory, calculateCreditScore};