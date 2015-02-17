'use strict';

var controller     = require('stackers'),
    ig             = require('instagram-node').instagram(),
    db             = require('../lib/db'),
		fs             = require('fs'),
		path           = require('path'),
		conf           = require('./../conf'),
		async          = require('async'),
		userMiddleware = require('../middleware/user'),
		superagent     = require('superagent'),
		Download       = require('download'),
    Canvas         = require('canvas');

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

// Render the basic options from app/index, hardcoded for now
appController.get('', function (req, res) {
	res.render('app/index', req);
});

// Select the small or large poster and render app/pick, this is our main app,
// the rest of the interactions happen from ajax request
appController.get('/photos/pick', function (req, res) {
	req.quantity = 16
	var size = req.param('q')
	if (size == "m"){
		req.quantity = 25
	}
	if (size == "l"){
		req.quantity = 49
	}

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
	if(cat == "liked"){
		ig.user_self_liked({max_like_id: max_id}, handleAnswer);
	} else if(cat == "uploaded"){
		ig.user_self_media_recent({max_id: max_id}, handleAnswer);
	} else {
		ig.user_self_feed({max_id: max_id}, handleAnswer);
	}
})

// After the user has selected enough photos, create the order and the poster
appController.post('/order/create', function (req, res) {
	var price = 24900;
	if (req.body.quantity == 16){
		price = 22900;
	}

	////// Create a new order
	var newOrder = new Order({
		user     : res.locals.user,
		photos   : JSON.parse(req.body.photos),
		price    : price
	});

  newOrder.save(function (err, order) {
    createPosterForImages(newOrder, function(posterUrl){
      newOrder.posterUrl = posterUrl;

      newOrder.save(function (err, order) {
        if (err) { return res.status(500).send(err); }

        // Create the image, answer with the url.
        res.json({
          redirect_url: "/app/checkout/" + order.id,
          poster_url: posterUrl,
        });
      });
    })
  });
});

// Render the checkout page
appController.get('/checkout/:orderId', function (req, res) {
  console.log("here");
	getCreditCardsForCustomer(res.locals.user.conekta_customer_id, function(err, conektaRes){
		if(err) return res.status(500).send(err);

		// Get CCs
		req.cards = conektaRes.body.cards
		req.defaultCardId = conektaRes.body.default_card_id
		res.render('app/product', req);
	})
});

/// Process the checkout
appController.post('/checkout/:orderId', function (req, res) {
	req.requestOrder.address = req.body.address
  req.requestOrder.phone = req.body.phone
  req.requestOrder.email = req.body.email

  req.requestOrder.save(function (err, order) {
		if (err) { return res.status(500).send(err); }

		var handler = function(err, conektaRes){
			if(err) return res.send(500,err);

			charge(res.locals.user.conekta_customer_id, 24900, "Poster de Instagram", function(err, conektaRes){
				if(err) return res.send(500,err);

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

// This endpoint is used to predownload the images as they are selected
appController.post('/predownload/image', function (req, res) {
	var photo = JSON.parse(req.body.photo);
	getOrDownload(photo, function(photoStringUrl){
		res.json({
			status: "Ok",
		});
	})
});


function createPosterForImages(order, callback){

  var rows = 4;
  var columns = 4;
  var size = 1100;
  var padding = 10;
  if(order.photos.length == 25){
    var size = 2000;
    var rows = 5;
    var columns = 5;
  }

	function saveCanvas(canvas, callback){
    var folder = process.cwd() + '/public/posters/'
    var fullFilename = folder + order.id + '.jpg'


		canvas.toBuffer(function(err, buf){
			if (err)
				console.log("error saving to buffer")
			else
				if (!fs.existsSync( folder )){
						fs.mkdirSync( folder );
				}
				fs.writeFile(fullFilename, buf, function(){
					callback(conf.baseUrl + '/posters/' + order.id + '.jpg');
				});
		});
	}

	//Get all of the photos(download if necessary)
	var photosLoadingArray = order.photos.map(function(photo){
		return function(done){
			getOrDownload(photo, function(err, data){
				done(null, data)
				})
			}
		})

	async.parallel(photosLoadingArray, function(err, photoDataArray){
		if (err) throw err;

		var canvas = new Canvas(size, size);
		var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;

    // white background
    ctx.fillStyle = 'white';
    //draw background / rect on entire canvas
    ctx.fillRect(0,0,size,size);

    for(var column = 0; column < columns; column++){
      for(var row = 0; row < rows; row++){

        var width = size / columns;
        var height = size / rows;
        var x = column * width;
        var y = row * height;

        var img = new Canvas.Image;
        img.src = photoDataArray[column * 4 + row];

        ctx.save();
        ctx.translate(x + width / 2, y + height / 2);
        ctx.beginPath();
        ctx.rect(width / 2 * (-1) + padding, height / 2 * (-1) + padding, width - padding * 2, height - padding * 2);
        ctx.lineWidth = 8;
        ctx.strokeStyle = 'black';
        ctx.stroke();
        ctx.drawImage(img,width / 2 * (-1) + padding ,height / 2 * (-1) + padding, width - padding * 2, height  - padding * 2);
        ctx.restore();

      }
    }

		saveCanvas(canvas, callback);
	});

}

function getOrDownload(photo, callback){
	var dirAddress = process.cwd() + "/photos/"
	var photoStringPath = dirAddress + path.basename(photo.images.standard_resolution.url);

	// if photos doesnt exist, create
	if (!fs.existsSync( dirAddress )){
			fs.mkdirSync( dirAddress);
	}

	fs.stat(photoStringPath, function (err, stats) {
		if (!err){
			fs.readFile(photoStringPath, function(err, data) {
				callback(err, data)
			});
		} else {
			// No lo tengo
			var download = new Download()
			download.get(photo.images.standard_resolution.url, dirAddress);

			download.run(function (err, files) {
				if (err) {
						console.log(err)
						throw err;
				}
				fs.readFile(photoStringPath, function(err, data) {
					callback(err, data)
				});
			});
		}
	});
}

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

module.exports = appController;
