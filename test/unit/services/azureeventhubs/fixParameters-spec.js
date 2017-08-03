/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var azureeventhubs = require('../../../../lib/services/azureeventhubs/');

describe('Eventhubs', function() {

  describe('fixParameters', function() {
    before(function() {
      process.env['ALLOW_TO_GENERATE_NAMES_AND_PASSWORDS_FOR_THE_MISSING'] = 'true';
      process.env['DEFAULT_RESOURCE_GROUP'] = 'azure-service-broker';
      process.env['DEFAULT_LOCATION'] = 'eastus';
      process.env['DEFAULT_PARAMETERS_AZURE_EVENTHUBS'] = '{\
        "eventHubProperties": {\
            "messageRetentionInDays": 1,\
            "partitionCount": 2\
        }\
      }';
    });
    
    var paramsToValidate = ['resourceGroup', 'namespaceName', 'location', 'eventHubProperties'];
      
    describe('When no parameter passed in', function() {
      var parameters = {};
      
      it('should fix the parameters', function() {
        var fixedParams = azureeventhubs.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
      });
    });
    
    describe('When part of parameters passed in: namespaceName', function() {
      var parameters = {'namespaceName': 'fake-name'};
      
      it('should fix the parameters', function() {
        var fixedParams = azureeventhubs.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        fixedParams.namespaceName.should.equal('fake-name');
      });
    });
  });
});