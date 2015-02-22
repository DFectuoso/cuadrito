'use strict';

var controller     = require('stackers'),
    ig             = require('instagram-node').instagram(),
    db             = require('../lib/db'),
    fs             = require('fs'),
    conf           = require('./../conf'),
    async          = require('async'),
    userMiddleware = require('../middleware/user'),
    Mixpanel       = require('mixpanel');

var mixpanel = Mixpanel.init(conf.mixpanel.id);

var Order = db.model('order'),
    User  = db.model('user');

// Configure the IG object to use the correct clientID and Secret from Conf
ig.use({ client_id: conf.instagramoauth.clientID,
         client_secret: conf.instagramoauth.clientSecret });

// Start our controller on path /app
var brandController = controller({
  path : '/chivas'
});

// Validate every request and preload User session information
brandController.beforeEach(userMiddleware.getUser);

// Render the basic options from app/index, hardcoded for now
brandController.get('', function (req, res) {
  mixpanel.track("showed chivas", {distinct_id:res.locals.user.username});
  res.render('brand/index', req);
});

brandController.get('/photos/pick', function (req, res) {
  mixpanel.track("picked chivas event", {distinct_id:res.locals.user.username});
  res.render('brand/pick', req);
});

brandController.get('/checkout', function (req, res) {
  mixpanel.track("picked chivas photos", {distinct_id:res.locals.user.username});
  res.render('brand/checkout', req);
});

brandController.post('/checkout', function (req, res) {
  mixpanel.track("picked chivas finished", {distinct_id:res.locals.user.username});
  res.render('brand/thanks', req);
});

module.exports = brandController;
