var log = require('winston').loggers.get('common');

var should = require('should');
var sinon = require('sinon');
var util = require('util');
var AzureEnvironment = require('ms-rest-azure').AzureEnvironment;
var request = require('request');

var Common = require('../../../lib/common');
var Token = require('../../../lib/common/token');

describe('Util', function() {

  describe('config', function() {
    context('when configurations are set via environment variables', function() {
      var keys = [
        'ENVIRONMENT',
        'SUBSCRIPTION_ID',
        'TENANT_ID',
        'CLIENT_ID',
        'CLIENT_SECRET',
        'SECURITY_USER_NAME',
        'SECURITY_USER_PASSWORD',
        'AZURE_BROKER_DATABASE_PROVIDER',
        'AZURE_BROKER_DATABASE_SERVER',
        'AZURE_BROKER_DATABASE_USER',
        'AZURE_BROKER_DATABASE_PASSWORD',
        'AZURE_BROKER_DATABASE_NAME',
        'AZURE_BROKER_DATABASE_ENCRYPTION_KEY'
      ];

      var environmentVariablesToBackup = {};
      keys.forEach(function(key){
        environmentVariablesToBackup[key] = process.env[key];
      });

      var environmentVariablesToSet = {};
      keys.forEach(function(key){
        environmentVariablesToSet[key] = 'fake-' + key;
      });
      environmentVariablesToSet['AZURE_BROKER_DATABASE_ENCRYPTION_KEY'] = 'abcdefghijklmnopqrstuvwxyz123456'; // The key size must be 32

      var expectedConfig = {
        'azure': {
          'environment': environmentVariablesToSet['ENVIRONMENT'],
          'subscriptionId': environmentVariablesToSet['SUBSCRIPTION_ID'],
          'tenantId': environmentVariablesToSet['TENANT_ID'],
          'clientId': environmentVariablesToSet['CLIENT_ID'],
          'clientSecret': environmentVariablesToSet['CLIENT_SECRET'],
        },
        'serviceBroker': {
          'credentials': {
            'authUser': environmentVariablesToSet['SECURITY_USER_NAME'],
            'authPassword': environmentVariablesToSet['SECURITY_USER_PASSWORD']
          }
        },
        'database': {
          'provider': environmentVariablesToSet['AZURE_BROKER_DATABASE_PROVIDER'],
          'server': environmentVariablesToSet['AZURE_BROKER_DATABASE_SERVER'],
          'user': environmentVariablesToSet['AZURE_BROKER_DATABASE_USER'],
          'password': environmentVariablesToSet['AZURE_BROKER_DATABASE_PASSWORD'],
          'database': environmentVariablesToSet['AZURE_BROKER_DATABASE_NAME'],
          'encryptionKey': environmentVariablesToSet['AZURE_BROKER_DATABASE_ENCRYPTION_KEY'],
        },
        'privilege': {
          'sqldb': {
            'allowToCreateSqlServer': true
          }
        },
        'accountPool': {
          'sqldb': {}
        },
        'defaultSettings': {
          'sqldb': {
            'transparentDataEncryption': false
          }
        }
      };
      
      describe('in case AZURE_SQLDB_ALLOW_TO_CREATE_SQL_SERVER and AZURE_SQLDB_SQL_SERVER_POOL are not in environment variables', function() {
        before(function() {
          keys.forEach(function(key){
            process.env[key] = environmentVariablesToSet[key];
          });
          delete process.env['AZURE_SQLDB_ALLOW_TO_CREATE_SQL_SERVER'];
          delete process.env['AZURE_SQLDB_SQL_SERVER_POOL'];
        });

        after(function() {
          keys.forEach(function(key){
            process.env[key] = environmentVariablesToBackup[key];
          });
        });

        it('should fetch configurations from environment variables', function() {
          var actualConfig = Common.getConfigurations();
          actualConfig.should.eql(expectedConfig);
        });
      });
      
      describe('in case AZURE_SQLDB_ALLOW_TO_CREATE_SQL_SERVER is true', function() {
        before(function() {
          process.env['AZURE_SQLDB_ALLOW_TO_CREATE_SQL_SERVER'] = 'true';
          process.env['AZURE_SQLDB_SQL_SERVER_POOL'] = '[ \
            { \
              "resourceGroup": "fake-group", \
              "location": "fake-location", \
              "sqlServerName": "fake-server0", \
              "administratorLogin": "fake-login0", \
              "administratorLoginPassword": "fake-pwd0" \
            }, \
            { \
              "resourceGroup": "fake-group", \
              "location": "fake-location", \
              "sqlServerName": "fake-server1", \
              "administratorLogin": "fake-login1", \
              "administratorLoginPassword": "fake-pwd1" \
            } \
          ]';
        
          expectedConfig['privilege']['sqldb']['allowToCreateSqlServer'] = true;
          expectedConfig['accountPool']['sqldb'] = {
            'fake-server0': {
              'resourceGroup': 'fake-group',
              'location': 'fake-location',
              'administratorLogin': 'fake-login0',
              'administratorLoginPassword': 'fake-pwd0'
            },
            'fake-server1': {
              'resourceGroup': 'fake-group',
              'location': 'fake-location',
              'administratorLogin': 'fake-login1',
              'administratorLoginPassword': 'fake-pwd1'
            }
          };
          
          keys.forEach(function(key){
            process.env[key] = environmentVariablesToSet[key];
          });
        });

        after(function() {
          keys.forEach(function(key){
            process.env[key] = environmentVariablesToBackup[key];
          });
        });
        
        it('should fetch configurations from environment variables - 2', function() {
          var actualConfig = Common.getConfigurations();
          actualConfig.should.eql(expectedConfig);
        });
      });
        
      describe('in case AZURE_SQLDB_ALLOW_TO_CREATE_SQL_SERVER is false, and administratorLoginPassword is in pcf-tile format', function() {
        before(function() {
          process.env['AZURE_SQLDB_ALLOW_TO_CREATE_SQL_SERVER'] = 'false';
          process.env['AZURE_SQLDB_SQL_SERVER_POOL'] = '[ \
            { \
              "resourceGroup": "fake-group", \
              "location": "fake-location", \
              "sqlServerName": "fake-server0", \
              "administratorLogin": "fake-login0", \
              "administratorLoginPassword": {"secret": "fake-pwd0"} \
            }, \
            { \
              "resourceGroup": "fake-group", \
              "location": "fake-location", \
              "sqlServerName": "fake-server1", \
              "administratorLogin": "fake-login1", \
              "administratorLoginPassword": {"secret": "fake-pwd1"} \
            } \
          ]';
          
          expectedConfig['privilege']['sqldb']['allowToCreateSqlServer'] = false;
          expectedConfig['accountPool']['sqldb'] = {
            'fake-server0': {
              'resourceGroup': 'fake-group',
              'location': 'fake-location',
              'administratorLogin': 'fake-login0',
              'administratorLoginPassword': 'fake-pwd0'
            },
            'fake-server1': {
              'resourceGroup': 'fake-group',
              'location': 'fake-location',
              'administratorLogin': 'fake-login1',
              'administratorLoginPassword': 'fake-pwd1'
            }
          };
          
          keys.forEach(function(key){
            process.env[key] = environmentVariablesToSet[key];
          });
        });

        after(function() {
          keys.forEach(function(key){
            process.env[key] = environmentVariablesToBackup[key];
          });
        });
        
        it('should fetch configurations from environment variables - 3', function() {
          var actualConfig = Common.getConfigurations();
          actualConfig.should.eql(expectedConfig);
        });
      });
      
      describe('in case AZURE_SQLDB_ENABLE_TRANSPARENT_DATA_ENCRYPTION is true', function() {
        before(function() {
          process.env['AZURE_SQLDB_ENABLE_TRANSPARENT_DATA_ENCRYPTION'] = 'true';
          
          expectedConfig['defaultSettings']['sqldb']['transparentDataEncryption'] = true;
          
          keys.forEach(function(key){
            process.env[key] = environmentVariablesToSet[key];
          });
        });

        after(function() {
          keys.forEach(function(key){
            process.env[key] = environmentVariablesToBackup[key];
          });
        });
        
        it('should fetch configurations from environment variables - 4', function() {
          var actualConfig = Common.getConfigurations();
          actualConfig.should.eql(expectedConfig);
        });
      });
      
      describe('in case AZURE_SQLDB_ENABLE_TRANSPARENT_DATA_ENCRYPTION is false', function() {
        before(function() {
          process.env['AZURE_SQLDB_ENABLE_TRANSPARENT_DATA_ENCRYPTION'] = 'false';
          
          expectedConfig['defaultSettings']['sqldb']['transparentDataEncryption'] = false;
          
          keys.forEach(function(key){
            process.env[key] = environmentVariablesToSet[key];
          });
        });

        after(function() {
          keys.forEach(function(key){
            process.env[key] = environmentVariablesToBackup[key];
          });
        });
        
        it('should fetch configurations from environment variables - 5', function() {
          var actualConfig = Common.getConfigurations();
          actualConfig.should.eql(expectedConfig);
        });
      });
      
      describe('in case AZURE_SQLDB_ENABLE_TRANSPARENT_DATA_ENCRYPTION is not present', function() {
        before(function() {
          delete process.env['AZURE_SQLDB_ENABLE_TRANSPARENT_DATA_ENCRYPTION'];
          
          expectedConfig['defaultSettings']['sqldb']['transparentDataEncryption'] = false;
          
          keys.forEach(function(key){
            process.env[key] = environmentVariablesToSet[key];
          });
        });

        after(function() {
          keys.forEach(function(key){
            process.env[key] = environmentVariablesToBackup[key];
          });
        });
        
        it('should fetch configurations from environment variables - 3', function() {
          var actualConfig = Common.getConfigurations();
          actualConfig.should.eql(expectedConfig);
        });
      });
    });
  });

  describe('getEnvironment()', function() {
    it('should get the environment by the name', function() {
      var envName = 'AzureCloud';
      var env = Common.getEnvironment(envName);
      env.should.be.exactly(AzureEnvironment.Azure);
      envName = 'AzureChinaCloud';
      var env = Common.getEnvironment(envName);
      env.should.be.exactly(AzureEnvironment.AzureChina);
    });
  });

  describe('logHttpResponse()', function() {
    before(function() {
      sinon.stub(log, 'debug');
    });

    after(function() {
      log.debug.restore();
    });

    it('should call log.debug with correct message when logging body', function() {
      var operation = 'operationx';
      Common.logHttpResponse({
                               statusCode: '123',
                               headers: {
                                 'x-ms-request-id': 'aaa',
                                 'x-ms-correlation-request-id': 'bbb',
                                 'x-ms-routing-request-id': 'ccc'
                               },
                               'body': {}
                             },
                             operation,
                             true);

      var message = util.format('receive from: %s\n%s: %s\n%s: %s\n%s: %s\n%s: %s\n%s: %s\n',
                                operation,
                                'statusCode', '123',
                                'x-ms-request-id', 'aaa',
                                'x-ms-correlation-request-id', 'bbb',
                                'x-ms-routing-request-id', 'ccc',
                                'body', '{}');
      sinon.assert.calledWithMatch(log.debug, 'HTTP Response: %s', message);
    });

    it('should call log.debug with correct message when not logging body', function() {
      var operation = 'operationx';
      Common.logHttpResponse({
                               statusCode: '123',
                               headers: {
                                 'x-ms-request-id': 'aaa',
                                 'x-ms-correlation-request-id': 'bbb',
                                 'x-ms-routing-request-id': 'ccc'
                               },
                               'body': 'ddd'
                             },
                             operation,
                             false);

      var message = util.format('receive from: %s\n%s: %s\n%s: %s\n%s: %s\n%s: %s\n%s\n',
                                operation,
                                'statusCode', '123',
                                'x-ms-request-id', 'aaa',
                                'x-ms-correlation-request-id', 'bbb',
                                'x-ms-routing-request-id', 'ccc',
                                'response.body cannot be logged because it may contain credentials.');
      sinon.assert.calledWithMatch(log.debug, 'HTTP Response: %s', message);
    });
  });
  
  describe('getToken()', function() {
    describe('when the status code of response is 200', function() {
      before(function() {
        Token.init({}, {});
        sinon.stub(request, 'post').yields(null, {statusCode: 200}, '{"access_token": "asdasdasd"}');
      });

      after(function() {
        request.post.restore();
      });
      
      it('should get the token', function() {
        Token.getToken(true, function(err, token) {
          should.not.exist(err);
          token.should.be.exactly('asdasdasd');
        });
      });
    });
    
    describe('when the status code of response is 403', function() {
      before(function() {
        Token.init({}, {});
        sinon.stub(request, 'post').yields(null, {statusCode: 403});
      });

      after(function() {
        request.post.restore();
      });
      
      it('should get an error', function() {
        Token.getToken(true, function(err, token) {
          should.exist(err);
          err.statusCode.should.equal(403);
        });
      });
    });
  });
});
