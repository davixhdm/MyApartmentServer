const axios = require('axios');

// Mock M-Pesa integration – replace with actual Safaricom API
exports.initiateMpesaPayment = async (phone, amount, accountReference) => {
  // This is a placeholder. In production, you'd call Safaricom API.
  console.log(`Initiating M-Pesa payment to ${phone} for ${amount}`);
  return {
    CheckoutRequestID: 'ws_CO_' + Date.now(),
    CustomerMessage: 'Please enter your PIN to complete'
  };
};

exports.queryMpesaStatus = async (checkoutRequestId) => {
  // Placeholder
  return { ResultCode: 0 };
};