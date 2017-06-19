/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var azureservicebus = require('../../../../lib/services/azureservicebus/');

describe('ServiceBus', function() {

  describe('fixParameters', function() {
    before(function() {
      process.env['ALLOW_TO_GENERATE_NAMES_AND_PASSWORDS_FOR_THE_MISSING'] = 'true';
      process.env['DEFAULT_RESOURCE_GROUP'] = 'azure-service-broker';
      process.env['DEFAULT_LOCATION'] = 'eastus';
      process.env['DEFAULT_PARAMETERS_AZURE_SERVICEBUS'] = '{\
        "type": "Messaging",\
        "messagingTier": "Standard"\
      }';
    });
    
    var paramsToValidate = ['resourceGroup', 'namespaceName', 'location', 'type', 'messagingTier'];
      
    describe('When no parameter passed in', function() {
      var parameters = {};
      
      it('should fix the parameters', function() {
        var fixedParams = azureservicebus.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
      });
    });

    describe('When part of parameters passed in: messagingTier', function() {
      var parameters = {'messagingTier': 'Basic'};
      
      it('should fix the parameters', function() {
        var fixedParams = azureservicebus.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        fixedParams.messagingTier.should.equal('Basic');
      });
    });
    
    describe('When part of parameters passed in: namespaceName', function() {
      var parameters = {'namespaceName': 'fake-name'};
      
      it('should fix the parameters', function() {
        var fixedParams = azureservicebus.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        fixedParams.namespaceName.should.equal('fake-name');
      });
    });
  });
});