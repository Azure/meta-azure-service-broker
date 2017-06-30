var common = require('../../lib/common');
var statusCode = require('./statusCode');
var eventHubs = require('eventhubs-js');
require('promise');

module.exports = function(environment) {
  var clientName = 'azureservicebusClient';
  var log = common.getLogger(clientName);
  
  this.validateCredential = function(credential, next) {
    try {
      eventHubs.init({
        hubNamespace: credential['namespace_name'],
        hubName: credential['event_hub_name'],
        keyName: credential['shared_access_key_name'],
        key: credential['shared_access_key_value']
      });

      eventHubs.sendMessage({
        message: 'eventhub test message',
        deviceId: 1,
      }).then(function() {
        next(statusCode.PASS);
      });
    } catch (ex) {
      log.error('Got exception: ' + ex);
      next(statusCode.FAIL);
    }   
  };
};
