/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var azurestorage = require('../../../../lib/services/azurestorage/');

describe('Storage', function() {

  describe('fixParameters', function() {
    before(function() {
      process.env['ALLOW_TO_GENERATE_NAMES_AND_PASSWORDS_FOR_THE_MISSING'] = 'true';
      process.env['DEFAULT_RESOURCE_GROUP'] = 'azure-service-broker';
      process.env['DEFAULT_LOCATION'] = 'eastus';
      process.env['DEFAULT_PARAMETERS_AZURE_STORAGE'] = '{\
        "accountType": "Standard_LRS"\
      }';
    });
    
    var paramsToValidate = ['resourceGroup', 'storageAccountName', 'location', 'accountType'];
      
    describe('When no parameter passed in', function() {
      var parameters = {};
      
      it('should fix the parameters', function() {
        var fixedParams = azurestorage.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
      });
    });

    describe('When part of parameters passed in: accountType', function() {
      var parameters = {'accountType': 'fake-type'};
      
      it('should fix the parameters', function() {
        var fixedParams = azurestorage.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        fixedParams.accountType.should.equal('fake-type');
      });
    });
    
    describe('When part of parameters passed in: storageAccountName', function() {
      var parameters = {'storageAccountName': 'fake-name'};
      
      it('should fix the parameters', function() {
        var fixedParams = azurestorage.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        fixedParams.storageAccountName.should.equal('fake-name');
      });
    });
  });
});