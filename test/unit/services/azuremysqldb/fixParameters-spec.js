/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var azuremysqldb = require('../../../../lib/services/azuremysqldb/');

describe('MySqlDb', function() {

  describe('fixParameters', function() {
    before(function() {
      process.env['ALLOW_TO_GENERATE_NAMES_AND_PASSWORDS_FOR_THE_MISSING'] = 'true';
      process.env['DEFAULT_RESOURCE_GROUP'] = 'azure-service-broker';
      process.env['DEFAULT_LOCATION'] = 'eastus';
      process.env['DEFAULT_PARAMETERS_AZURE_MYSQLDB'] = '{\
        "mysqlServerParameters": {\
          "allowMysqlServerFirewallRules": [\
            {\
              "ruleName": "all",\
              "startIpAddress": "0.0.0.0",\
              "endIpAddress": "255.255.255.255"\
            }\
          ],\
          "properties": {\
            "version": "5.6",\
            "sslEnforcement": "Disabled",\
            "storageMB": 51200\
          }\
        }\
      }';
    });
    
    var paramsToValidate = ['resourceGroup', 'mysqlServerName', 'location', 'mysqlServerParameters'];
      
    describe('When no parameter passed in', function() {
      var parameters = {};
      
      it('should fix the parameters', function() {
        var fixedParams = azuremysqldb.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
      });
    });

    describe('When part of parameters passed in: version', function() {
      var parameters = {'mysqlServerParameters': { 'properties': {'version': 'fake-version'}}};
      
      it('should fix the parameters', function() {
        var fixedParams = azuremysqldb.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        fixedParams.mysqlServerParameters.properties.version.should.equal('fake-version');
      });
    });
    
    describe('When part of parameters passed in: mysqlServerName', function() {
      var parameters = {'mysqlServerName': 'fake-name'};
      
      it('should fix the parameters', function() {
        var fixedParams = azuremysqldb.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        fixedParams.mysqlServerName.should.equal('fake-name');
      });
    });
  });
});