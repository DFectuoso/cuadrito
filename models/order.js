var db = require('../lib/db'),
    schema = db.Schema;

var orderSchema = schema({
  user         : { type : schema.Types.ObjectId, ref: 'user', required : true },
  userNickname : { type : schema.Types.ObjectId, ref: 'user', required : true },
  address      : { type : String},
  email        : { type : String },
  phone        : { type : String },
  status       : { type : String, default: 'created'},
  created      : { type : Date, default: Date.now },
  photos       : { type : Array , "default" : [] },
  price        : { type : Number },
  previewUrl   : { type : String }
  photos       : { type : Array , "default" : [] },
});

var Order = db.model('order', orderSchema);

module.exports = Order;
