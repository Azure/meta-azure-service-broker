/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var azurepostgresqldb = require('../../../../lib/services/azurepostgresqldb/');

describe('PostgreSqlDb', function() {

  describe('fixParameters - allow to generate names and passwords', function() {
    before(function() {
      process.env['ALLOW_TO_GENERATE_NAMES_AND_PASSWORDS_FOR_THE_MISSING'] = 'true';
      process.env['DEFAULT_RESOURCE_GROUP'] = 'azure-service-broker';
      process.env['DEFAULT_LOCATION'] = 'eastus';
      process.env['DEFAULT_PARAMETERS_AZURE_POSTGRESQLDB'] = '{\
        "postgresqlServerParameters": {\
          "allowpostgresqlServerFirewallRules": [\
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
    
    var paramsToValidate = ['resourceGroup', 'postgresqlServerName', 'location', 'postgresqlServerParameters'];
      
    describe('When no parameter passed in', function() {
      var parameters = {};
      
      it('should fix the parameters', function() {
        var fixedParams = azurepostgresqldb.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
      });
    });

    describe('When part of parameters passed in: version', function() {
      var parameters = {'postgresqlServerParameters': { 'properties': {'version': 'fake-version'}}};
      
      it('should fix the parameters', function() {
        var fixedParams = azurepostgresqldb.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        fixedParams.postgresqlServerParameters.properties.version.should.equal('fake-version');
      });
    });
    
    describe('When part of parameters passed in: postgresqlServerName', function() {
      var parameters = {'postgresqlServerName': 'fake-name'};
      
      it('should fix the parameters', function() {
        var fixedParams = azurepostgresqldb.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        fixedParams.postgresqlServerName.should.equal('fake-name');
      });
    });
  });
  
  describe('fixParameters - not allow to generate names and passwords', function() {
    before(function() {
      process.env['ALLOW_TO_GENERATE_NAMES_AND_PASSWORDS_FOR_THE_MISSING'] = 'false';
      process.env['DEFAULT_RESOURCE_GROUP'] = 'azure-service-broker';
      process.env['DEFAULT_LOCATION'] = 'eastus';
      process.env['DEFAULT_PARAMETERS_AZURE_POSTGRESQLDB'] = '{\
        "postgresqlServerParameters": {\
          "allowpostgresqlServerFirewallRules": [\
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
    
    var paramsToValidate = ['resourceGroup', 'location', 'postgresqlServerParameters'];
    describe('When no parameter passed in', function() {
      var parameters = {};
      
      it('should fix the parameters', function() {
        var fixedParams = azurepostgresqldb.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        should.not.exist(fixedParams.postgresqlServerName);
        should.not.exist(fixedParams.postgresqlServerParameters.properties.administratorLogin);
      });
    });

  });
});
