/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var azurerediscache = require('../../../../lib/services/azurerediscache/');

describe('RedisCache', function() {

  describe('fixParameters', function() {
    before(function() {
      process.env['ALLOW_TO_GENERATE_NAMES_AND_PASSWORDS_FOR_THE_MISSING'] = 'true';
      process.env['DEFAULT_RESOURCE_GROUP'] = 'azure-service-broker';
      process.env['DEFAULT_LOCATION'] = 'eastus';
      process.env['DEFAULT_PARAMETERS_AZURE_REDISCACHE'] = '{\
        "parameters": {\
          "enableNonSslPort": false,\
          "sku": {\
            "name": "Basic",\
            "family": "C",\
            "capacity": 0\
          }\
        }\
      }';
    });
    
    var paramsToValidate = ['resourceGroup', 'cacheName', 'location', 'parameters'];
      
    describe('When no parameter passed in', function() {
      var parameters = {};
      
      it('should fix the parameters', function() {
        var fixedParams = azurerediscache.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
      });
    });

    describe('When part of parameters passed in: messagingTier', function() {
      var parameters = {'parameters': {'sku': {'name': 'Standard'}} };
      
      it('should fix the parameters', function() {
        var fixedParams = azurerediscache.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        fixedParams.parameters.sku.name.should.equal('Standard');
      });
    });
    
    describe('When part of parameters passed in: cacheName', function() {
      var parameters = {'cacheName': 'fake-name'};
      
      it('should fix the parameters', function() {
        var fixedParams = azurerediscache.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        fixedParams.cacheName.should.equal('fake-name');
      });
    });
  });
});