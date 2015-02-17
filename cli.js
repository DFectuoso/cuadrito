var argv = require('optimist').argv;
var action = argv._[0];

var conf  = require('./conf');
var User  = require('./models/user');
var fs    = require('fs');

if(argv.v){
  console.log('Arguments',argv);
}

var username = argv.u || argv.username;

console.log("Inputed action: " + action)

if(action === 'add-admin'){
  if(username){
    console.log('Making', username, 'an admin');

    var query = User.findOne({
      username : username
    });

    query.exec(function(err, user){
      if(err){
        console.log('Err finding user', err);
        process.exit();
      }

      if(!user){
        console.log('No user', username);
        process.exit();
      }

      user.role = 'admin';
      user.save(function(err){
        if(err){
          console.log('Err couldnt set user as admin', err);
          process.exit();
        }

        console.log('Success', username, 'is admin now!!!');
        process.exit();
      });
    });
  }else{
    // node cli.js add-admin -u siedrix
    // node cli.js add-admin --username Siedrix
    console.log('node cli.js add-admin -u {username}');
    console.log('node cli.js add-admin --username {username}');
    process.exit();
  }
}else{
  console.log('invalid action, check cli.js to verify what you are doing');
  process.exit();
}
