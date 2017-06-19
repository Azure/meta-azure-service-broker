/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var azuresqldb = require('../../../../lib/services/azuresqldb/');

describe('SqlDb', function() {

  describe('fixParameters - new server', function() {
    before(function() {
      process.env['ALLOW_TO_GENERATE_NAMES_AND_PASSWORDS_FOR_THE_MISSING'] = 'true';
      process.env['DEFAULT_RESOURCE_GROUP'] = 'azure-service-broker';
      process.env['DEFAULT_LOCATION'] = 'eastus';
      process.env['DEFAULT_PARAMETERS_AZURE_SQLDB'] = '{\
        "sqlServerParameters": {\
          "allowSqlServerFirewallRules": [\
            {\
              "ruleName": "all",\
              "startIpAddress": "0.0.0.0",\
              "endIpAddress": "255.255.255.255"\
            }\
          ]\
        },\
        "transparentDataEncryption": true,\
        "sqldbParameters": {\
          "properties": {\
            "collation": "SQL_Latin1_General_CP1_CI_AS"\
          }\
        }\
      }';
    });
    
    var paramsToValidate = ['resourceGroup', 'sqlServerName', 'location', 'sqlServerParameters', 'sqldbName', 'transparentDataEncryption', 'sqldbParameters'];
      
    describe('When no parameter passed in', function() {
      var parameters = {};
      
      it('should fix the parameters', function() {
        var fixedParams = azuresqldb.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
      });
    });

    describe('When part of parameters passed in: collation', function() {
      var parameters = {'sqldbParameters': { 'properties': {'collation': 'fake-collation'}}};
      
      it('should fix the parameters', function() {
        var fixedParams = azuresqldb.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        fixedParams.sqldbParameters.properties.collation.should.equal('fake-collation');
      });
    });
    
    describe('When part of parameters passed in: sqldbName', function() {
      var parameters = {'sqldbName': 'fake-name'};
      
      it('should fix the parameters', function() {
        var fixedParams = azuresqldb.fixParameters(parameters);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        fixedParams.sqldbName.should.equal('fake-name');
      });
    });
  });
  
  describe('fixParameters - existing server', function() {
    process.env['ALLOW_TO_GENERATE_NAMES_AND_PASSWORDS_FOR_THE_MISSING'] = 'true';
    process.env['DEFAULT_RESOURCE_GROUP'] = 'azure-service-broker';
    process.env['DEFAULT_LOCATION'] = 'eastus';
    process.env['DEFAULT_PARAMETERS_AZURE_SQLDB'] = '{\
      "sqlServerParameters": {\
        "allowSqlServerFirewallRules": [\
          {\
            "ruleName": "all",\
            "startIpAddress": "0.0.0.0",\
            "endIpAddress": "255.255.255.255"\
          }\
        ]\
      },\
      "transparentDataEncryption": true,\
      "sqldbParameters": {\
        "properties": {\
          "collation": "SQL_Latin1_General_CP1_CI_AS"\
        }\
      }\
    }';
    
    var accountPool = {
      'sqldb': {
        'sqlservera': {
          'resourceGroup': 'fake-rg',
          'location': 'fake-location',
          'administratorLogin': 'fake-admin',
          'administratorLoginPassword': 'fake-pwd'
        }
      }
    };
    
    var paramsToValidate = ['sqlServerName', 'sqldbName', 'transparentDataEncryption', 'sqldbParameters'];
    
    describe('When only server name passed in: collation', function() {
      var parameters = {'sqlServerName': 'sqlservera'};
      
      it('should fix the parameters', function() {
        var fixedParams = azuresqldb.fixParameters(parameters, accountPool);
        paramsToValidate.forEach(function(param){
          should.exist(fixedParams[param]);
        });
        
        should.not.exist(fixedParams['resourceGroup']);
        should.not.exist(fixedParams['location']);
        should.not.exist(fixedParams['sqlServerParameters']);
      });
    });
  });
  
});
