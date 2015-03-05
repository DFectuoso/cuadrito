'use strict';
var controller = require('stackers'),
	db = require('../lib/db'),
	ig = require('instagram-node').instagram(),
	_ = require('underscore');

var conf = require('./../conf');

var User = db.model('user');

ig.use({ client_id: conf.instagramoauth.clientID,
				client_secret: conf.instagramoauth.clientSecret });

var loginController = controller({
	path : ''
});

var scope = conf.instagramoauth.scope;
var redirect_uri = conf.instagramoauth.redirectUri;

loginController.get('/login', function (req, res) {
	var redirect_url = "/app/photos/pick"
	if(req.param('redirect') === 'brand'){
		redirect_url = "/chivas/photos/pick"
	}

	if (req.session && req.session.passport && req.session.passport.user) {
		return res.redirect(redirect_url);
	}

	req.session.redirect_url = redirect_url
	res.redirect(ig.get_authorization_url(redirect_uri, { scope: scope }));
});


loginController.get('/oauth', function (req, res) {
	var code = req.param('code');
	var redirect_url = req.session.redirect_url || "/app/photos/pick"

	ig.authorize_user(code, redirect_uri, function(err, result){
		if (err) {
			console.error('oh no! something went wrong!');
			console.error(err.body);
			res.status(500).send(err);
		} else {

			User.findOne({username: result.user.username}, function (err, user) {
				if (err) { return res.status(500).send(err); }

				if (user){
					user.token = result.access_token;

					user.save(function (err) {
						if (err) { res.status(500).send(err); }

						req.session.user = user._id.toString();
						res.redirect(redirect_url);
					});
				}else{
					// New User
					var newUser = new User({
						username : result.user.username,
						token : result.access_token,
					});

					newUser.save(function (err, user) {
						if (err) { return res.status(500).send(err); }

						user.createConektaCustomer();

						req.session.user = user._id.toString();
						res.redirect(redirect_url);
					});
				}
			});

		}
	})
});


loginController.get('/logout', function (req, res) {
	req.session.destroy();
	res.redirect('/');
});

module.exports = loginController;
