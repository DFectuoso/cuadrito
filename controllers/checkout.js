'use strict';

var controller     = require('stackers'),
    db             = require('../lib/db'),
    conf           = require('./../conf'),
    userMiddleware = require('../middleware/user'),
    superagent     = require('superagent'),
    Mixpanel       = require('mixpanel');

var mixpanel = Mixpanel.init(conf.mixpanel.id);

var Order = db.model('order'),
    User  = db.model('user');

// Start our controller on path /app
var checkoutController = controller({
  path : '/checkout'
});

// Validate every request and preload User session information
checkoutController.beforeEach(userMiddleware.getUser);

// Render the checkout page
checkoutController.get('/:orderId', function (req, res) {
  mixpanel.track("Show checkout");

  getCreditCardsForCustomer(res.locals.user.conekta_customer_id, function(err, conektaRes){
    if(err) return res.status(500).send(err);

    // Get CCs
    req.cards = conektaRes.body.cards
    req.defaultCardId = conektaRes.body.default_card_id
    res.render('app/product', req);
  })
});

/// Process the checkout
checkoutController.post('/:orderId', function (req, res) {
  mixpanel.track("Process checkout");

  var price = 24900;

  req.requestOrder.address = req.body.address
  req.requestOrder.phone = req.body.phone
  req.requestOrder.email = req.body.email

  req.requestOrder.save(function (err, order) {
    if (err) { return res.status(500).send(err); }

    var handler = function(err, conektaRes){
      if(err) return res.send(500,err);

      charge(res.locals.user.conekta_customer_id, price, "Poster de Instagram", function(err, conektaRes){
        if(err) return res.send(500,err);

        mixpanel.people.track_charge(res.locals.user.nickname, price / 100);

        var sendgrid = require("sendgrid")(conf.sendgrid.api_user, conf.sendgrid.api_key);

        var email = new sendgrid.Email();
        email.addTo("santiago1717@gmail.com");
        email.setFrom("santiago1717@gmail.com");
        email.setSubject("COMPRA EN CUADRITO");
        email.setHtml("ADDRESS: " + req.requestOrder.address + " <br>Phone: " + req.requestOrder.phone + " <br>email : " + req.requestOrder.email + " <br>Cuadrito: " + req.requestOrder.posterUrl);
        sendgrid.send(email);

        var email = new sendgrid.Email();
        email.addTo("santiago1717@gmail.com");
        email.setFrom(req.requestOrder.email);
        email.setSubject("Gracias por comprar tu Cuadrito");
        email.setHtml("Gracias por comprar tu cuadrito, en algunos momentos estaremos comunicandonos contigo al telefono que nos diste para ponernos de acuerdo con la entrega. <br> Muchas gracias! <br/> El equipo de Cuadrito.co");
        sendgrid.send(email);



        res.render('app/purchase', req);
      })
    }

    // If we have a conektaTokenId, it means we just tokenized this card
    if (req.body.conektaTokenId){
      addCardToCustomer(res.locals.user.conekta_customer_id, req.body.conektaTokenId, handler)
    } else {
      setCardAsActive(res.locals.user.conekta_customer_id, req.body.cardOptions, handler)
    }

  });
});

function addCardToCustomer(customerId, cardToken, callback){
  superagent
    .post('https://api.conekta.io/customers/' + customerId + '/cards/')
    .auth(conf.conekta.privateKey, '')
    .set('Content-type', 'application/json')
    .set('Accept', 'application/vnd.conekta-v1.0.0+json')
    .send({
      token: cardToken,
    })
    .end(callback);
}

function setCardAsActive(customerId, cardId, callback){
  superagent
    .put('https://api.conekta.io/customers/' + customerId)
    .auth(conf.conekta.privateKey, '')
    .set('Content-type', 'application/json')
    .set('Accept', 'application/vnd.conekta-v1.0.0+json')
    .send({
      default_card_id: cardId,
    })
    .end(callback);
}

function charge(customerId, amount, description, callback){
  superagent
    .post('https://api.conekta.io/charges')
    .auth(conf.conekta.privateKey, '')
    .set('Content-type', 'application/json')
    .set('Accept', 'application/vnd.conekta-v1.0.0+json')
    .send({
      card : customerId,
      amount : amount,
      description : description
    })
    .end(callback);
}

function getCreditCardsForCustomer(customerId, callback){
  console.log("about to ping " + 'https://api.conekta.io/customers/' + customerId)
  superagent
    .get('https://api.conekta.io/customers/' + customerId)
    .auth(conf.conekta.privateKey, '')
    .set('Content-type', 'application/json')
    .set('Accept', 'application/vnd.conekta-v1.0.0+json')
    .end(callback);
}

module.exports = checkoutController;
