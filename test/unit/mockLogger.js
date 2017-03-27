var mock = require('mock-require');
var logger = {
  info: function(){},
  debug: function(){},
  error: function(){},
  warn: function(){}
};

mock('winston', { loggers: {
  add: function() {
    return logger;
  },
  get: function() {
    return logger;
  },
  loggers: {}
}});