var path           = require('path'),
    templatesDir   = path.join(__dirname, '../emailTemplates'),
    emailTemplates = require('email-templates'),
    conf = require('./../conf');

var sendgrid = require("sendgrid")(conf.sendgrid.api_user, conf.sendgrid.api_key);

var email = {};

email.sendEmail = function(templateName, locals, subject, toAddress){
  emailTemplates(templatesDir, function(err, template) {
    // Adding the baseUrl to be available everywhere
    locals.baseUrl = conf.baseUrl;

    template(templateName, locals, function(err, html, text) {

      var email = new sendgrid.Email({
        to:       toAddress,
        from:     conf.fromEmail,
        subject:  subject,
        text:     text,
        html:     html
      });
      sendgrid.send(email);

    });
  });
}

module.exports = email;
