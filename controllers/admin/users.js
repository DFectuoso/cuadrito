var controller = require('stackers');

var User = require('../../models/user'),
    Order = require('../../models/order'),
    userMiddleware = require('../../middleware/user');

var userAdminController = controller({
  path : 'admin/users',
  child : true
});

userAdminController.beforeEach(userMiddleware.getUser);
userAdminController.beforeEach(function(req, res, next){
  if( res.locals.user.can('dashboard', 'view')) next(); else res.send('403');
});

userAdminController.get('', function (req, res) {
  var query = User.find({},function(err, users){
    if(err) return res.send(500, err);

    res.data.users = users;
    res.render('admin/users/list', req);
  });
});

userAdminController.get('/:userId', function (req, res) {
  var query = Order.find({user: req.requestUser})
  query.exec(function(err, orders){
    if(err) return res.send(500, err)
    req.orders = orders
    res.render('admin/users/info', req);
  })
});

userAdminController.post('/:userId', function (req, res) {
  req.requestUser.role = req.body.role;

  req.requestUser.save(function(err){
    if(err){
      return res.send(500, err);
    }

    res.redirect('/admin/users');
  });
});

module.exports = userAdminController;
