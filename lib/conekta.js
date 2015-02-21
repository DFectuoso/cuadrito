var superagent = require('superagent');

var create_client = function(privateKey) {
  var conekta = {};

  conekta.private = privateKey;

  conekta.makeRequest = function(method, endpoint, data, callback){
    method = (method || "").toLowerCase();
    if(['get', 'post', 'put'].indexOf(method) === -1){
      return callback(new Error('Unsupported method'));
    }

    superagent
      [method]('https://api.conekta.io/' + endpoint)
      .auth(conekta.private, '')
      .set('Content-type', 'application/json')
      .set('Accept', 'application/vnd.conekta-v1.0.0+json')
      .send(data)
      .end(callback);
  }

  conekta.addCardToCustomer = function(customerId, cardToken, callback){
    conekta.makeRequest('post', 'customers/' + customerId + '/cards/', { token: cardToken, }, callback)
  }

  conekta.setCardAsActive = function(customerId, cardId, callback){
    conekta.makeRequest('put',  customerId , {default_card_id: cardId,}, callback)
  }

  conekta.charge = function(customerId, amount, description, callback){
    var data = {
      card : customerId,
      amount : amount,
      description : description
    }
    conekta.makeRequest('post', '/charges', data, callback)
  }

  conekta.getCreditCardsForCustomer = function(customerId, callback){
    conekta.makeRequest('get', '/customers/' + customerId, {}, callback)
  }

  return conekta;
}

module.exports = {
    init: create_client
};
