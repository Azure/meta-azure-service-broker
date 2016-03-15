'use strict';

var Logule = require('logule');

module.exports.requestLogger = function(opts) {
  var log = Logule.init(module, opts.prefix);

  return function(req, res, next) {
    res.on('finish', function() {
      log.info(req.connection.remoteAddress + ' - ' + res.statusCode +
        ' - ' + req.method + ' - ' + req.url);
      log.debug('Params: %j', req.params);
      log.debug('Headers: %j', req.headers);
    });

    res.on('error', function(err) {
      log.error('Error processing request: ' + err + ' ' + req.connection
        .remoteAddress + ' - ' + res.statusCode + ' - ' + req.url);
      log.debug('Params: %j', req.params);
      log.debug('Headers: %j', req.headers);
    });

    next();
  };
};

module.exports.validateAPIVersion = function(version) {
  var log = Logule.init(module);

  var header = 'x-broker-api-version';

  return function(req, res, next) {
    if (!req.headers[header]) {
      log.warn(header + ' is missing from the request');
    } else {
      var pattern = new RegExp('^' + version.major + '\\.\\d+$');
      if (!req.headers[header].match(pattern)) {
        log.warn('Incompatible services API version: ' + req.headers[header]);
        res.status(412);
        res.end();
      }
    }
    next();
  };
};
