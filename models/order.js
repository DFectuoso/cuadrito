var db       = require('../lib/db'),
    path     = require('path'),
    fs       = require('fs'),
    Download = require('download'),
    async    = require('async'),
    conf     = require('./../conf'),
    Canvas   = require('canvas'),
    schema   = db.Schema;

var orderSchema = schema({
  user         : { type : schema.Types.ObjectId, ref: 'user', required : true },
  address      : { type : String},
  email        : { type : String },
  phone        : { type : String },
  status       : { type : String, default: 'created'},
  product      : { type : String},
  created      : { type : Date, default: Date.now },
  photos       : { type : Array , "default" : [] },
  price        : { type : Number },
  previewUrl   : { type : String },
  printables   : { type : Array , "default" : [] },
});

var Order = db.model('order', orderSchema);

Order.prototype.generatePreview = function(callback){
  // Get a new Snoocore Object
  var currentOrder = this;

  var padding = 16;
  var size = 500;

  // Default 11x9x10
  var quantity = 9
  var columns = 3;
  var rows = 3;


  if (currentOrder.product == "30x30x4x4"){
    quantity = 16
    columns = 4;
    rows = 4;
  } else if (currentOrder.product == "30x30x5x5"){
    quantity = 25
    columns = 5;
    rows = 5;
  }

  function saveCanvas(canvas, callback){
    var folder = process.cwd() + '/public/posters/'
    var fullFilename = folder + "preview" + currentOrder.id + '.png'

    canvas.toBuffer(function(err, buf){
      if (err)
        console.log("error saving to buffer")
      else
        if (!fs.existsSync( folder )){ fs.mkdirSync( folder );}
        fs.writeFile(fullFilename, buf, function(){ callback(conf.baseUrl + '/posters/preview' + currentOrder.id + '.png'); });
    });
  }

  //Get all of the photos(download if necessary)
  var photosLoadingArray = currentOrder.photos.map(function(photo){
    return function(done){
      Order.getOrDownload(photo, function(err, data){
        done(null, data)
        })
      }
    })

  async.parallel(photosLoadingArray, function(err, photoDataArray){
    if (err) throw err;

    var canvas = new Canvas(size, size);
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;

    // white background
    ctx.fillStyle = 'white';
    //draw background / rect on entire canvas
    ctx.fillRect(0,0,size,size);

    var width = size / columns;
    var height = size / rows;

    for(var column = 0; column < columns; column++){
      for(var row = 0; row < rows; row++){

        var x = column * width;
        var y = row * height;

        var img = new Canvas.Image;
        img.src = photoDataArray[column * rows + row];

        ctx.save();
        ctx.translate(x + width / 2, y + height / 2);
        ctx.beginPath();
        ctx.rect(width / 2 * (-1) + padding, height / 2 * (-1) + padding, width - padding * 2, height - padding * 2);
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'black';
        ctx.stroke();
        ctx.drawImage(img,width / 2 * (-1) + padding ,height / 2 * (-1) + padding, width - padding * 2, height  - padding * 2);
        ctx.restore();

      }
    }

    saveCanvas(canvas, callback);
  });
}

Order.prototype.generatePrintables = function(callback){
  // Get a new Snoocore Object
  var currentOrder = this;


  if (currentOrder.product == "30x30x4x4" || currentOrder.product == "30x30x5x5"){
    var padding = 60;
    var margin = 200;
    var size = 4600;

    // Default 11x9x10
    var quantity = 16;
    var columns = 4;
    var rows = 4;

    if (currentOrder.product == "30x30x5x5"){
      quantity = 25
      columns = 5;
      rows = 5;
    }

    function saveCanvas(canvas, callback){
      var folder = process.cwd() + '/public/posters/'
      var fullFilename = folder + currentOrder.id + '.png'

      canvas.toBuffer(function(err, buf){
        if (err)
          console.log("error saving to buffer")
        else
          if (!fs.existsSync( folder )){ fs.mkdirSync( folder );}
          fs.writeFile(fullFilename, buf, function(){

            currentOrder.printables = [conf.baseUrl + '/posters/' + currentOrder.id + '.png']
            currentOrder.save(function(err,order){
              callback(currentOrder);
            })
          });
      });
    }

    //Get all of the photos(download if necessary)
    var photosLoadingArray = currentOrder.photos.map(function(photo){
      return function(done){
        Order.getOrDownload(photo, function(err, data){
          done(null, data)
          })
        }
      })

    async.parallel(photosLoadingArray, function(err, photoDataArray){
      if (err) throw err;

      var canvas = new Canvas(size, size);
      var ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;

      // white background
      ctx.fillStyle = 'white';
      //draw background / rect on entire canvas
      ctx.fillRect(0,0,size,size);

      var width = (size - margin * 2) / columns;
      var height = (size - margin * 2) / rows;

      for(var column = 0; column < columns; column++){
        for(var row = 0; row < rows; row++){

          var x = column * width + margin;
          var y = row * height + margin;

          var img = new Canvas.Image;
          img.src = photoDataArray[column * rows + row];

          ctx.save();
          ctx.translate(x + width / 2, y + height / 2);
          ctx.beginPath();
          ctx.rect(width / 2 * (-1) + padding, height / 2 * (-1) + padding, width - padding * 2, height - padding * 2);
          ctx.lineWidth = 26;
          ctx.strokeStyle = 'black';
          ctx.stroke();
          ctx.drawImage(img,width / 2 * (-1) + padding ,height / 2 * (-1) + padding, width - padding * 2, height  - padding * 2);
          ctx.restore();

        }
      }

      saveCanvas(canvas, callback);
    });

  } else {

    var width = 1063;
    var height = 1299;
    var padding = 106;
    var remainingPhotos = 10;
    var printables = []

    function saveCanvas(i, canvas, callback){
      var folder = process.cwd() + '/public/posters/'
      var fullFilename = folder + currentOrder.id + "_" + i + '.png'


      canvas.toBuffer(function(err, buf){
        if (err)
          console.log("error saving to buffer")
        else
          if (!fs.existsSync( folder )){ fs.mkdirSync( folder );}
          fs.writeFile(fullFilename, buf, function(){
            printables.push(conf.baseUrl + '/posters/' + currentOrder.id +  "_" + i + '.png')

            remainingPhotos = remainingPhotos - 1;
            if(remainingPhotos == 0){
              currentOrder.printables = printables
              currentOrder.save(function(err,order){
                callback(order);
              })
            }
          });
      });
    }

    //Get all of the photos(download if necessary)
    var photosLoadingArray = currentOrder.photos.map(function(photo){
      return function(done){
        Order.getOrDownload(photo, function(err, data){
          done(null, data)
          })
        }
      })

    async.parallel(photosLoadingArray, function(err, photoDataArray){
      if (err) throw err;

      for(var i = 0; i < photoDataArray.length; i++){
        var canvas = new Canvas(width, height);
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;

        // white background
        ctx.fillStyle = 'white';
        //draw background / rect on entire canvas
        ctx.fillRect(0,0,width,height);


        var x = padding;
        var y = padding;

        var img = new Canvas.Image;
        img.src = photoDataArray[i];

        ctx.drawImage(img, x, y, width - padding * 2, width - padding * 2);

        saveCanvas(i, canvas, callback);
      }
    });
  }
}


Order.getOrDownload = function(photo, callback){
  // Define the place where we download
  var dirAddress = process.cwd() + "/photos/"
  var photoStringPath = dirAddress + path.basename(photo.images.standard_resolution.url);

  // if photos doesnt exist, create
  if (!fs.existsSync( dirAddress )){ fs.mkdirSync( dirAddress); }

  // If the photo existe
  fs.stat(photoStringPath, function (err, stats) {
    if (!err){
      fs.readFile(photoStringPath, function(err, data) { callback(err, data) });
    } else {
      // No lo tengo
      var download = new Download()
      download.get(photo.images.standard_resolution.url, dirAddress);
      download.run(function (err, files) {
        if (err) { throw err; }
        fs.readFile(photoStringPath, function(err, data) {
          callback(err, data)
        });
      });
    }
  });
}


module.exports = Order;
