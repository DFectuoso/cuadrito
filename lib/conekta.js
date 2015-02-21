var superagent = require('superagent');

var conekta = {};

var makeRequest = function(method, privatekey, endpoint,data, callback){
  method = (method || "").toLowerCase();
  if(['get', 'post', 'put'].indexOf(method) === -1){
    return callback(new Error('Unsupported method'));
  }


  superagent
    [method]('https://api.conekta.io/' + endpoint)
    .auth(privatekey, '')
    .set('Content-type', 'application/json')
    .set('Accept', 'application/vnd.conekta-v1.0.0+json')
    .send(data)
    .end(callback);
}


conekta.addCardToCustomer = function(privatekey, customerId, cardToken, callback){
  console.log("Adding card:" + cardToken + " to customer: " + customerId);
  makeRequest('post', privatekey , 'customers/' + customerId + '/cards/', { token: cardToken, }, callback)
}

conekta.setCardAsActive = function(privatekey, customerId, cardId, callback){
  console.log("setting card as active");
  makeRequest('put', privatekey ,  customerId , {default_card_id: cardId,}, callback)
}

conekta.charge = function(privatekey, customerId, amount, description, callback){
  console.log("Doing a charge");
  var data = {
    card : customerId,
    amount : amount,
    description : description
  }
  makeRequest('post', privatekey ,  '/charges', data, callback)
}

conekta.getCreditCardsForCustomer = function(privatekey, customerId, callback){
  makeRequest('get', privatekey ,  '/customers/' + customerId, {}, callback)
}

module.exports = conekta;
