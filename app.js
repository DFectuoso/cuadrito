'use strict';
var express  = require('express'),
	// _        = require('underscore'),
	swig     = require('swig'),
	flash = require('connect-flash'),
	session = require('express-session'),
	logger = require('morgan'),
	bodyParser = require('body-parser');

// Load conf
var conf = require('./conf');
console.log('Running app.js in', conf.env, 'environment');

var app = express();

// Connects with db and load models
var db = require('./lib/db');
db.loadModels(['user', 'order']);

// Static assets
app.use(express.static('./public'));

// Template engine
var swigHelpers = require('./views/helpers');
swigHelpers(swig);

app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.set('view cache', false);

// Swig cache for production
if (conf.env === 'production') {
	console.log('Adding cache to templates', conf.env);
	swig.setDefaults({ cache: 'memory' });
} else {
	swig.setDefaults({ cache: false });
}

// Add session to the app
var RedisStore = require('connect-redis')(session);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(logger(':status :req[x-real-ip] :method :response-time ms :url'));
app.use(session({
	store: new RedisStore(conf.redis.options),
	secret: 'keyboard cat',
	saveUninitialized : true,
	resave : true
}));
app.use(flash());

app.get('/', function (req, res) {
	if (req.session.user) {
		return res.redirect('/app');
	}
	res.render('home/index');
});

app.post('/contactForm', function (req, res) {
	var sendgrid = require("sendgrid")(conf.sendgrid.api_user, conf.sendgrid.api_key);
	var email = new sendgrid.Email();

	email.addTo("santiago1717@gmail.com");
	email.setFrom("santiago1717@gmail.com");
	email.setSubject("Contact form Cuadrito.co");
	email.setHtml("Name: " + req.body.name + " Email: " + req.body.email + " Message: " + req.body.message);

	sendgrid.send(email);
	res.render('home/contacted');
});

// Controllers
var loginController = require('./controllers/login');
var appController = require('./controllers/app');
var checkoutController = require('./controllers/checkout');
var adminDashboard = require('./controllers/admin/dashboard.js');

checkoutController(app);
loginController(app);
adminDashboard(app);
appController(app);

//////////// PARAMS
var User    = require('./models/user');
var Order    = require('./models/order');

app.param('userId', function(req,res, next, id){
	User.findOne({_id:id}, function (e, user){
		if (e) return res.send(500, e);
		if (!user) return res.send(404, e);
		req.requestUser = user;
		next();
	});
});

app.param('orderId', function(req,res, next, id){
	Order.findOne({_id:id}, function (e, order){
		if (e) return res.send(500, e);
		if (!order) return res.send(404, e);
		req.requestOrder = order;
		next();
	});
});

//////////////
/// LOCALS ///
//////////////
app.locals.mixpanel = conf.mixpanel.id;



app.listen(conf.port);
