var common = require('../../lib/common');
var azure = require('azure');
var async = require('async');
var statusCode = require('./statusCode');
var supportedEnvironments = require('./supportedEnvironments');

module.exports = function(environment) {
  var clientName = 'azureservicebusClient';
  common.getLogger(clientName, clientName);
  var log = require('winston').loggers.get(clientName);
  
  this.validateCredential = function(credential, next) {
    var connectionString = 'Endpoint=sb://' + credential['namespace_name'] + supportedEnvironments[environment]['serviceBusEndpointSuffix'] + '/;SharedAccessKeyName=' + credential['shared_access_key_name'] + ';SharedAccessKey=' + credential['shared_access_key_value']; 
    log.debug('connectionString: ' + connectionString);
    var queueName = 'azureservicebus' + Math.floor(Math.random()*1000);
    var message = {body: 'servicebus test message'};
    try {
      var serviceBusService = azure.createServiceBusService(connectionString);
      async.waterfall([
        function(callback) {
          serviceBusService.createQueueIfNotExists(queueName, function(error){
            if(!error){
              log.debug('Queue created or exists.');
              callback(null, statusCode.PASS);
            } else {
              log.error('Queue ' + queueName + ' not created. Error: ' + error);
              callback(error);
            }
          });
        },
        function(created, callback) {
          serviceBusService.sendQueueMessage(queueName, message, function(error){
            if(!error){
              log.debug('message sent');
              callback(null, statusCode.PASS);
            } else {
              log.error('Failed to send message, Error: ' + error);
              callback(error);
            }
          });
        },
        function(sent, callback) {
          serviceBusService.receiveQueueMessage(queueName, function(error, receivedMessage){
            if(!error){
              if(receivedMessage.body == 'servicebus test message') {
                log.debug('message received');
                callback(null, statusCode.PASS);
              } else {
                log.error('Message does not match. Sent: ' + message + ' Received: ' + receivedMessage);
                callback(new Error('recive message does not match the message sent'), statusCode.FAIL);
              }
            } else {
              log.error('Failed to receive message. Error: ' + receivedMessage);
              callback(error);
            }
          });
        }
      ],
      function(err, result) {
        if (err || result != statusCode.PASS) {
          next(statusCode.FAIL);
        } else {
          next(statusCode.PASS);
        }
      });
    } catch (ex) {
      log.error('Got exception: ' + ex);
      next(statusCode.FAIL);
    }   
  };
};
