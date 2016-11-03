var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var util = require('util');
var AzureEnvironment = require('ms-rest-azure').AzureEnvironment;
var request = require('request');

var Common = require('../../../lib/common');
var Token = require('../../../lib/common/token');
var log = logule.init(module, 'ServiceBroker-Mocha');

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
        'AZURE_BROKER_DATABASE_NAME'
      ];

      var environmentVariablesToBackup = {};
      keys.forEach(function(key){
        environmentVariablesToBackup[key] = process.env[key];
      });

      var environmentVariablesToSet = {};
      keys.forEach(function(key){
        environmentVariablesToSet[key] = 'fake-' + key;
      });

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
          'database': environmentVariablesToSet['AZURE_BROKER_DATABASE_NAME']
        }
      };

      before(function() {
        keys.forEach(function(key){
          process.env[key] = environmentVariablesToSet[key];
        });
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
      Common.logHttpResponse(log,
                             {
                               headers: {
                                 'x-ms-request-id': 'aaa',
                                 'x-ms-correlation-request-id': 'bbb',
                                 'x-ms-routing-request-id': 'ccc'
                               },
                               'body': {}
                             },
                             operation,
                             true);

      var message = util.format('receive from: %s\n%s: %s\n%s: %s\n%s: %s\n%s: %s\n',
                                operation,
                                'x-ms-request-id', 'aaa',
                                'x-ms-correlation-request-id', 'bbb',
                                'x-ms-routing-request-id', 'ccc',
                                'body', '{}');
      sinon.assert.calledWithMatch(log.debug, 'HTTP Response: %s', message);
    });

    it('should call log.debug with correct message when not logging body', function() {
      var operation = 'operationx';
      Common.logHttpResponse(log,
                             {
                               headers: {
                                 'x-ms-request-id': 'aaa',
                                 'x-ms-correlation-request-id': 'bbb',
                                 'x-ms-routing-request-id': 'ccc'
                               },
                               'body': 'ddd'
                             },
                             operation,
                             false);

      var message = util.format('receive from: %s\n%s: %s\n%s: %s\n%s: %s\n%s\n',
                                operation,
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
        sinon.stub(request, 'post').yields(null, {statusCode: 200}, '{"access_token": "asdasdasd"}');
      });

      after(function() {
        request.post.restore();
      });
      
      it('should get the token', function() {
        Token.getToken('', '', '', '', function(err, token) {
          should.not.exist(err);
          token.should.be.exactly('asdasdasd');
        });
      });
    });
    
    describe('when the status code of response is 403', function() {
      before(function() {
        sinon.stub(request, 'post').yields(null, {statusCode: 403});
      });

      after(function() {
        request.post.restore();
      });
      
      it('should get an error', function() {
        Token.getToken('', '', '', '', function(err, token) {
          should.exist(err);
          err.statusCode.should.equal(403);
        });
      });
    });
  });
});
