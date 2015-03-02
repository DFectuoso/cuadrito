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
var appController = controller({
	path : '/app'
});

// Validate every request and preload User session information
appController.beforeEach(userMiddleware.getUser);

// Select the small or large poster and render app/pick, this is our main app,
// the rest of the interactions happen from ajax request
appController.get('/photos/pick', function (req, res) {
  req.product = req.param('product')

  // Default 11x9x10
  req.quantity = 20
  if (req.product == "30x30x4x4"){
    req.quantity = 16
  } else if (req.product == "30x30x5x5"){
    req.quantity = 25
  }

  mixpanel.track("picked_product", {product : req.product,distinct_id:res.locals.user.username});
	res.render('app/pick', req);
});

// Get photos based on a category(and max_id for valiation)
appController.get('/photos/category', function(req, res){
	ig.use({ access_token: res.locals.user.token });

	function handleAnswer(err, medias, pagination, limit){
		if(err) return res.status(500).send(err);
		req.session.pagination = pagination
		res.json({
			err: err,
			medias: medias,
			pagination : pagination
		});
	}

	var cat = req.param('cat')
	var max_id = req.param('max_id')

  mixpanel.track("loaded photos", {cat:cat, max_id:max_id,distinct_id:res.locals.user.username});

	if(cat == "liked"){
		ig.user_self_liked({max_like_id: max_id}, handleAnswer);
	} else if(cat == "uploaded"){
		ig.user_self_media_recent({max_id: max_id}, handleAnswer);
	} else {
		ig.user_self_feed({max_id: max_id}, handleAnswer);
	}
})

// This endpoint is used to predownload the images as they are selected
appController.post('/predownload/image', function (req, res) {
  var photo = JSON.parse(req.body.photo);
  Order.getOrDownload(photo, function(photoStringUrl){
    res.json({
      status: "Ok",
    });
  })
});


// After the user has selected enough photos, create the order and the poster
appController.post('/order/create', function (req, res) {
	var price = 19900;

  mixpanel.track("Picked photos for product", {product: req.body.product, quantity: req.body.quantity, photos:JSON.parse(req.body.photos),distinct_id:res.locals.user.username});

	////// Create a new order
	var newOrder = new Order({
		user     : res.locals.user,
		photos   : JSON.parse(req.body.photos),
    product  : req.body.product,
		price    : price
	});

  newOrder.save(function (err, order) {
    if (err) console.log(err);
    order.generatePreview(function(posterUrl){
      newOrder.previewUrl = posterUrl;

      newOrder.save(function (err, order) {
        if (err) { return res.status(500).send(err); }

        // Create the image, answer with the url.
        res.json({
          redirect_url: "/checkout/" + order.id,
          poster_url: posterUrl,
        });
      });
    })
  });
});

module.exports = appController;
