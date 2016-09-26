'use strict';

var HttpStatus = require('http-status-codes');

var Reply = function(statusCode, altStatusCode, altCode) {
  var reply = {};
  switch (statusCode) {
    case HttpStatus.OK:
      reply = {
        statusCode: altStatusCode || HttpStatus.OK,
        code: altCode || HttpStatus.getStatusText(HttpStatus.OK),
        value: {
          state: 'Succeeded',
          description: 'Operation was successful.'
        }
      };
      break;

    case HttpStatus.ACCEPTED:
      reply = {
        statusCode: altStatusCode || HttpStatus.ACCEPTED,
        code: altCode || HttpStatus.getStatusText(HttpStatus.ACCEPTED),
        value: {
          state: 'Succeeded',
          description: 'Operation was successful.'
        }
      };
      break;

    case HttpStatus.INTERNAL_SERVER_ERROR:
      reply = {
        statusCode: altStatusCode || HttpStatus.INTERNAL_SERVER_ERROR,
        code: altCode || HttpStatus.getStatusText(HttpStatus.INTERNAL_SERVER_ERROR),
        value: {
          state: 'Failed',
          description: 'Operation failed. Check the log for details.'
        }
      };
      break;
    default:
      reply = {};
      break;
  }
  return reply;
};

module.exports = Reply;
