'use strict';

var controller     = require('stackers'),
    db             = require('../lib/db'),
    conf           = require('./../conf'),
    userMiddleware = require('../middleware/user'),
    superagent     = require('superagent'),
    conekta        = require('../lib/conekta'),
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
  mixpanel.track("Show checkout", {distinct_id:res.locals.user.username});

  console.log("Cliente: " + res.locals.user.conekta_customer_id)
  conekta.getCreditCardsForCustomer(conf.conekta.privateKey, res.locals.user.conekta_customer_id, function(err, conektaRes){
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

  req.requestOrder.address = req.body.address
  req.requestOrder.phone = req.body.phone
  req.requestOrder.email = req.body.email

  req.requestOrder.save(function (err, order) {
    if (err) { return res.status(500).send(err); }

    var handler = function(err, conektaRes){
      if(err) return res.send(500,err);

      console.log(conektaRes);

      conekta.charge(conf.conekta.privateKey,res.locals.user.conekta_customer_id, price, "Poster de Instagram", function(err, conektaRes){
        if(err) return res.send(500,err);

        mixpanel.people.track_charge(res.locals.user.username, price / 100);

        var sendgrid = require("sendgrid")(conf.sendgrid.api_user, conf.sendgrid.api_key);

        var email = new sendgrid.Email();
        email.setFrom("santiago1717@gmail.com");
        email.addTo(req.requestOrder.email);
        email.setSubject("Gracias por tu compra en Cuadrito");
        email.setHtml("Gracias por comprar tu cuadrito, en algunos momentos estaremos comunicandonos contigo al telefono que nos diste para ponernos de acuerdo con la entrega. <br> Muchas gracias! <br/> El equipo de Cuadrito.co");
        sendgrid.send(email);

        req.requestOrder.generatePrintables(function(order){
          var email = new sendgrid.Email();
          email.addTo("santiago1717@gmail.com");
          email.setFrom("santiago1717@gmail.com");
          email.setSubject("COMPRA EN CUADRITO");

          var printable = "";
          for(var i = 0; i < order.printables.length; i++){
            printable += "<br/>Printable " + i + ": " + order.printables[i];
          }

          email.setHtml("ADDRESS: " + req.requestOrder.address + " <br>Phone: " + req.requestOrder.phone + " <br>email : " + req.requestOrder.email + " <br>Cuadrito: " + printable);
          sendgrid.send(email);
        })

        res.render('app/purchase', req);
      })
    }

    // If we have a conektaTokenId, it means we just tokenized this card
    if (req.body.conektaTokenId){
      conekta.addCardToCustomer(conf.conekta.privateKey, res.locals.user.conekta_customer_id, req.body.conektaTokenId, handler)
    } else {
      conekta.setCardAsActive(conf.conekta.privateKey, res.locals.user.conekta_customer_id, req.body.cardOptions, handler)
    }

  });
});


module.exports = checkoutController;
