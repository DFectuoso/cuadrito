var controller = require('stackers');

var User = require('../../models/user');
var userMiddleware = require('../../middleware/user');

var async = require('async');

var dashboardAdminController = controller({
  path : 'admin/dashboard',
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

  async.parallel(queries, function(err, data){
    req.totalUsers = data.totalUsers;

    res.render('admin/index', req);
  });

});


module.exports = dashboardAdminController;
