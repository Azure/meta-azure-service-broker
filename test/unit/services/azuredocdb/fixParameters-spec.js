/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var azuredocdb = require('../../../../lib/services/azuredocdb/');

describe('DocDB', function() {

  describe('fixParameters', function() {
    before(function() {
      process.env['ALLOW_TO_GENERATE_NAMES_AND_PASSWORDS_FOR_THE_MISSING'] = 'true';
      process.env['DEFAULT_RESOURCE_GROUP'] = 'azure-service-broker';
      process.env['DEFAULT_LOCATION'] = 'eastus';
      process.env['DEFAULT_PARAMETERS_AZURE_DOCDB'] = '{\
      }';
    });
    
    var paramsToValidate = ['resourceGroup', 'docDbAccountName', 'location', 'docDbName'];
      
    describe('When no parameter passed in', function() {
      var parameters = {};
      
      it('should fix the parameters', function() {
        var fixedParams = azuredocdb.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        fixedParams.location.should.equal('eastus');
        fixedParams.docDbAccountName.length.should.equal(12);
      });
    });

    describe('When part of parameters passed in: location', function() {
      var parameters = {'location': 'fake-location'};
      
      it('should fix the parameters', function() {
        var fixedParams = azuredocdb.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        fixedParams.location.should.equal('fake-location');
      });
    });
    
    describe('When part of parameters passed in: docDbAccountName', function() {
      var parameters = {'docDbAccountName': 'fake-name'};
      
      it('should fix the parameters', function() {
        var fixedParams = azuredocdb.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        fixedParams.docDbAccountName.should.equal('fake-name');
      });
    });
  });
});