var db = require('../lib/db'),
	schema = db.Schema,
	superagent = require('superagent'),
	_ = require('underscore');

var conf = require('./../conf');

var userSchema = schema({
	username             : {type : String, required : true},
	role                 : {type : String, required : true, default: 'user'},
	token                : {type : String, required : true},
	lastSeen             : { type : Date, default: Date.now },
	created              : { type : Date, default: Date.now },
	conekta_customer_id  : { type : String },
});

var User = db.model('user', userSchema);


User.prototype.can = function(resourse, action) {
	if(permisions[this.role] &&
		permisions[this.role][resourse] &&
		permisions[this.role][resourse][action]){
		return true;
	}else{
		return false;
	}
};

User.prototype.createConektaCustomer = function(){
	var currentUser = this;

	console.log("Conekta Private key: " + conf.conekta.privateKey)

	superagent
		.post('https://api.conekta.io/customers')
		.auth(conf.conekta.privateKey, '')
		.set('Content-type', 'application/json')
		.set('Accept', 'application/vnd.conekta-v1.0.0+json')
		.send({
			name: this.username,
		})
		.end(function(error, conektaRes){
			if(error) return res.send(500,err);

			currentUser.conekta_customer_id = conektaRes.body.id;
			console.log("Conekta id: " + conektaRes.body.id)
			currentUser.save(function (err, user) {
				if (err) { return res.status(500).send(err); }

				console.log("created conekta user")
			});
		});
}


var permisions = {};

User.setPermisions = function(role, config){
	if(!permisions[role]) permisions[role] = {};
	permisions[role] = _.extend(permisions[role],config);
};

User.setPermisions('admin', {
	users : {
		'edit' : true,
	},
	dashboard: {
		'view' : true,
	}
});

User.setPermisions('user', {});

module.exports = User;
