/* jshint camelcase: false */
/* jshint newcap: false */

var _ = require('underscore');
var HttpStatus = require('http-status-codes');

var docDbPoll = function(log, params) {
  
  var instanceId = params.instance_id;
  var provisioningResult = JSON.parse(params.provisioning_result);
  var lastoperation = params.last_operation || '';

  var resourceGroupName = provisioningResult.resourceGroupName || '';
  var docDbAccountName = provisioningResult.docDbAccountName || '';

  this.poll = function(docDb, next) {

    docDb.poll(resourceGroupName, docDbAccountName, function(err, state) {
      log.debug('DocumentDb, docDb.poll, err: %j', err);
      log.debug('DocumentDb, docDb.poll, state: %j', state); 
            
      var reply = {
        state: '',
        description: '',
      };
      if (lastoperation === 'provision') {
        if (err) {
          return next(err);
        }
        log.info(
          'Getting the provisioning state of the docDb account %s: %j',
          docDbAccountName, state);

        if (state == 'Succeeded') {
          reply.state = 'succeeded';
          reply.description = 'Creating the docDb account, state: ' + state;
        } else {
          reply.state = 'in progress';
          reply.description = 'Creating the docDb account, state: ' + state;
        }
      } else if (lastoperation === 'deprovision') {
        log.info(
          'Getting the deprovisioning state of the docDb account %s: %j',
          docDbAccountName, state);

        if (!err) {
          reply.state = 'in progress';
          reply.description = 'Deleting the docDb account';
        } else if (err.statusCode == HttpStatus.NOT_FOUND) {
          reply.state = 'succeeded';
          reply.description = 'Deleting the docDb account';
        } else {
          return next(err);
        }
      }
      reply = {
        statusCode: HttpStatus.OK,
        code: HttpStatus.getStatusText(HttpStatus.OK),
        value: reply,
      };
      next(null, reply);
    });
  };
};

module.exports = docDbPoll;

