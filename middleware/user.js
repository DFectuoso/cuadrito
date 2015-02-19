var User = require('../models/user'),
    db = require('../lib/db');

var conf = require('./../conf');
var middleware = {};

var Mixpanel = require('mixpanel');
var mixpanel = Mixpanel.init(conf.mixpanel.id);

middleware.getUser = function(req, res, next){
  if (!req.session.user ) {
    return res.redirect('/');
  }

  var id = db.Types.ObjectId(req.session.user);
  User.findOne({_id: id}, function (err, user) {
    if (!user) {
      return res.redirect('/');
    }

    user.lastSeen = Date.now()
    user.save();

    res.locals.user = user;

    mixpanel.people.set(user.username, {
      name: user.username,
      role: user.role,
      lastSeen: user.lastSeen.toISOString(),
      created: user.created.toISOString(),
      conekta_customer_id: user.conekta_customer_id,
    });


    next();
  });
}

module.exports = middleware;
