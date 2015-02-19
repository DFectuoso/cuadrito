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
    Canvas         = require('canvas'),
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

// Render the basic options from app/index, hardcoded for now
appController.get('', function (req, res) {
  mixpanel.track("showed products", {distinct_id:res.locals.user.nickname});
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

  mixpanel.track("picked_product", {size : size});
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

  mixpanel.track("loaded photos", {cat:cat, max_id:max_id});

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

  mixpanel.track("Picked photos", {quantity: req.body.quantity, photos:JSON.parse(req.body.photos)});

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
          redirect_url: "/checkout/" + order.id,
          poster_url: posterUrl,
        });
      });
    })
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
  var size = 4576;
  var padding = 40;
  if(order.photos.length == 25){
    var size = 4576;
    var rows = 5;
    var columns = 5;
  }

	function saveCanvas(canvas, callback){
    var folder = process.cwd() + '/public/posters/'
    var fullFilename = folder + order.id + '.png'


		canvas.toBuffer(function(err, buf){
			if (err)
				console.log("error saving to buffer")
			else
				if (!fs.existsSync( folder )){
						fs.mkdirSync( folder );
				}
				fs.writeFile(fullFilename, buf, function(){
					callback(conf.baseUrl + '/posters/' + order.id + '.png');
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

    var width = size / columns;
    var height = size / rows;

    for(var column = 0; column < columns; column++){
      for(var row = 0; row < rows; row++){

        var x = column * width;
        var y = row * height;

        var img = new Canvas.Image;
        img.src = photoDataArray[column * 4 + row];

        ctx.save();
        ctx.translate(x + width / 2, y + height / 2);
        ctx.beginPath();
        ctx.rect(width / 2 * (-1) + padding, height / 2 * (-1) + padding, width - padding * 2, height - padding * 2);
        ctx.lineWidth = 24;
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

module.exports = appController;
