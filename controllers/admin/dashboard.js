var controller = require('stackers');

var User = require('../../models/user');
var Order = require('../../models/order');
var userMiddleware = require('../../middleware/user');

var async = require('async');

var dashboardAdminController = controller({
  path : '/admin',
  child : true
});

dashboardAdminController.beforeEach(userMiddleware.getUser);
dashboardAdminController.beforeEach(function(req, res, next){
  if( res.locals.user.can('dashboard', 'view')) next(); else res.send('403');
});

dashboardAdminController.get('', function (req, res) {
  var queries = {};

  var totalUsers = User.count({});
  queries.totalUsers = function(done){
    totalUsers.exec(function(err, totalUsers){
      done(err, totalUsers);
    });
  };

  var totalOrders = Order.count({});
  queries.totalOrders = function(done){
    totalOrders.exec(function(err, totalOrders){
      done(err, totalOrders);
    });
  };

  async.parallel(queries, function(err, data){
    req.totalUsers = data.totalUsers;
    req.totalOrders = data.totalOrders;

    res.render('admin/index', req);
  });
});

module.exports = dashboardAdminController;
