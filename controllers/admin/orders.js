var controller = require('stackers');

var User = require('../../models/user');
var Order = require('../../models/order');
var userMiddleware = require('../../middleware/user');

var orderAdminController = controller({
  path : 'admin/orders',
  child : true
});

orderAdminController.beforeEach(userMiddleware.getUser);
orderAdminController.beforeEach(function(req, res, next){
  if( res.locals.user.can('dashboard', 'view')) next(); else res.send('403');
});

orderAdminController.get('', function (req, res) {
  var query = Order.find({})
  query.populate("user")

  query.exec(function(err, orders){
    if(err) return res.send(500, err);

    res.data.orders = orders;
    res.render('admin/orders/list', req);
  });
});

orderAdminController.get('/:orderId', function (req, res) {
  res.render('admin/orders/info', req);
});

module.exports = orderAdminController;
