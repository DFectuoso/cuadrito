var User = require('../models/user'),
    db = require('../lib/db');

var conf = require('./../conf');
var middleware = {};

middleware.getUser = function(req, res, next){
  if (!req.session.user ) {
    return res.redirect('/');
  }

  var id = db.Types.ObjectId(req.session.user);
  User.findOne({_id: id}, function (err, user) {
    if (!user) {
      return res.redirect('/');
    }

    res.locals.user = user;
    next();
  });
}

module.exports = middleware;
