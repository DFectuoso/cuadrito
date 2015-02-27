'use strict';

var controller     = require('stackers'),
    db             = require('../lib/db'),
    conf           = require('./../conf'),
    userMiddleware = require('../middleware/user'),
    superagent     = require('superagent'),
    Conekta        = require('conekta-node'),
    Mixpanel       = require('mixpanel'),
    email          = require('../middleware/email');

var mixpanel = Mixpanel.init(conf.mixpanel.id);
var conekta = Conekta.init(conf.conekta.privateKey);

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
  mixpanel.track("Show checkout", {distinct_id:res.locals.user.username});

  console.log("Cliente: " + res.locals.user.conekta_customer_id)
  conekta.getCreditCardsForCustomer(res.locals.user.conekta_customer_id, function(err, conektaRes){
    if(err) return res.status(500).send(err);

    // Get CCs
    req.cards = conektaRes.body.cards
    req.defaultCardId = conektaRes.body.default_card_id
    console.log(req.defaultCardId);
    res.render('app/product', req);
  })
});

/// Process the checkout
checkoutController.post('/:orderId', function (req, res) {
  mixpanel.track("Process checkout", {distinct_id:res.locals.user.username});
  var price = 19900;


  /// Store email and phone on the user

  req.requestOrder.address = req.body.address
  req.requestOrder.phone = req.body.phone
  req.requestOrder.email = req.body.email

  req.requestOrder.save(function (err, order) {
    if (err) { return res.status(500).send(err); }

    var handler = function(err, conektaRes){
      if(err) return res.send(500,err);

      conekta.charge(res.locals.user.conekta_customer_id, price, "Poster de Instagram", function(err, conektaRes){
        if(err) return res.send(500,err);

        mixpanel.people.track_charge(res.locals.user.username, price / 100);

        var emailData = {
          order        : req.requestOrder,
          printablePrice : price / 100,
        };
        email.sendEmail("salesConfirmation", emailData, 'Gracias por tu compra en Cuadrito', req.requestOrder.email);

        req.requestOrder.generatePrintables(function(order){
          var emailData = {
            order        : req.requestOrder,
            printablePrice : price / 100,
          };
          email.sendEmail("internalSale", emailData, 'Compra en cuadrito!', conf.fromEmail);
        });

        res.render('app/purchase', req);
      })
    }

    // If we have a conektaTokenId, it means we just tokenized this card
    if (req.body.conektaTokenId){
      conekta.addCardToCustomer(res.locals.user.conekta_customer_id, req.body.conektaTokenId, handler)
    } else {
      conekta.setCardAsActive(res.locals.user.conekta_customer_id, req.body.cardOptions, handler)
    }

  });
});


module.exports = checkoutController;
