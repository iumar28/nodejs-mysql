const express = require('express');
const bodyParser = require('body-parser');
const loanController = require('./controllers/loanController');
const customerController = require('./controllers/customerController');
const app = express();
app.use(bodyParser.json());

app.get('/view-loan/:loan_id', loanController.viewLoanDetails);
app.get('/getcustomerdata',customerController.getCustomerData);
app.post('/make-payment/:customer_id/:loan_id', loanController.makePayment);
app.post('/register', customerController.registerCustomer);
app.post('/check-eligibility',loanController.checkEligiblity);
app.get('/view-statement/:customer_id/:loan_id',loanController.viewStatement);


app.listen(3000, () => {
  console.log('server started at 3000');
});
