var mock = require('mock-require');
var logger = {
  info: function(){},
  debug: function(){},
  error: function(){},
  warn: function(){}
};

mock('winston', { loggers: {
  add: function() {
    return;
  },
  get: function() {
    return logger;
<<<<<<< HEAD
  },
  loggers: {}
=======
  }
>>>>>>> 2d516c4aea40dfb009515bcaa5447c21ad0c0320
}});