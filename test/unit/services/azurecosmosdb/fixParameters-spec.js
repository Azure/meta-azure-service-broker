/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var azurecosmosdb = require('../../../../lib/services/azurecosmosdb/');

describe('CosmosDB', function() {

  describe('fixParameters', function() {
    before(function() {
      process.env['ALLOW_TO_GENERATE_NAMES_AND_PASSWORDS_FOR_THE_MISSING'] = 'true';
      process.env['DEFAULT_RESOURCE_GROUP'] = 'azure-service-broker';
      process.env['DEFAULT_LOCATION'] = 'eastus';
      process.env['DEFAULT_PARAMETERS_AZURE_COSMOSDB'] = '{\
        "kind": "DocumentDB"\
      }';
    });
    
    var paramsToValidate = ['resourceGroup', 'cosmosDbAccountName', 'location', 'cosmosDbName', 'kind'];
      
    describe('When no parameter passed in', function() {
      var parameters = {};
      
      it('should fix the parameters', function() {
        var fixedParams = azurecosmosdb.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        fixedParams.location.should.equal('eastus');
        fixedParams.cosmosDbAccountName.length.should.equal(12);
      });
    });

    describe('When part of parameters passed in: kind', function() {
      var parameters = {'kind': 'fake-kind'};
      
      it('should fix the parameters', function() {
        var fixedParams = azurecosmosdb.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        fixedParams.kind.should.equal('fake-kind');
      });
    });
    
    describe('When part of parameters passed in: cosmosDbAccountName', function() {
      var parameters = {'cosmosDbAccountName': 'fake-name'};
      
      it('should fix the parameters', function() {
        var fixedParams = azurecosmosdb.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        fixedParams.cosmosDbAccountName.should.equal('fake-name');
      });
    });
  });
});