var log = require('winston').loggers.get('common');

var should = require('should');
var sinon = require('sinon');
var util = require('util');
var AzureEnvironment = require('ms-rest-azure').AzureEnvironment;
var request = require('request');
var underscore = require('underscore');

var Common = require('../../../lib/common');
var Token = require('../../../lib/common/token');

describe('Util', function () {

  describe('config', function () {
    context('when configurations are set via environment variables', function () {
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
      keys.forEach(function (key) {
        environmentVariablesToBackup[key] = process.env[key];
      });

      var environmentVariablesToSet = {};
      keys.forEach(function (key) {
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
          },
          'spaceScopingEnabled': false
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

      describe('in case AZURE_SQLDB_ALLOW_TO_CREATE_SQL_SERVER and AZURE_SQLDB_SQL_SERVER_POOL are not in environment variables', function () {
        before(function () {
          keys.forEach(function (key) {
            process.env[key] = environmentVariablesToSet[key];
          });
          delete process.env['AZURE_SQLDB_ALLOW_TO_CREATE_SQL_SERVER'];
          delete process.env['AZURE_SQLDB_SQL_SERVER_POOL'];
        });

        after(function () {
          keys.forEach(function (key) {
            process.env[key] = environmentVariablesToBackup[key];
          });
        });

        it('should fetch configurations from environment variables', function () {
          var actualConfig = Common.getConfigurations();
          actualConfig.should.eql(expectedConfig);
        });
      });

      describe('in case AZURE_SQLDB_ALLOW_TO_CREATE_SQL_SERVER is true', function () {
        before(function () {
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

          keys.forEach(function (key) {
            process.env[key] = environmentVariablesToSet[key];
          });
        });

        after(function () {
          keys.forEach(function (key) {
            process.env[key] = environmentVariablesToBackup[key];
          });
        });

        it('should fetch configurations from environment variables - 2', function () {
          var actualConfig = Common.getConfigurations();
          actualConfig.should.eql(expectedConfig);
        });
      });

      describe('in case AZURE_SQLDB_ALLOW_TO_CREATE_SQL_SERVER is false, and administratorLoginPassword is in pcf-tile format', function () {
        before(function () {
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

          keys.forEach(function (key) {
            process.env[key] = environmentVariablesToSet[key];
          });
        });

        after(function () {
          keys.forEach(function (key) {
            process.env[key] = environmentVariablesToBackup[key];
          });
        });

        it('should fetch configurations from environment variables - 3', function () {
          var actualConfig = Common.getConfigurations();
          actualConfig.should.eql(expectedConfig);
        });
      });

      describe('in case AZURE_SQLDB_ENABLE_TRANSPARENT_DATA_ENCRYPTION is true', function () {
        before(function () {
          process.env['AZURE_SQLDB_ENABLE_TRANSPARENT_DATA_ENCRYPTION'] = 'true';

          expectedConfig['defaultSettings']['sqldb']['transparentDataEncryption'] = true;

          keys.forEach(function (key) {
            process.env[key] = environmentVariablesToSet[key];
          });
        });

        after(function () {
          keys.forEach(function (key) {
            process.env[key] = environmentVariablesToBackup[key];
          });
        });

        it('should fetch configurations from environment variables - 4', function () {
          var actualConfig = Common.getConfigurations();
          actualConfig.should.eql(expectedConfig);
        });
      });

      describe('in case AZURE_SQLDB_ENABLE_TRANSPARENT_DATA_ENCRYPTION is false', function () {
        before(function () {
          process.env['AZURE_SQLDB_ENABLE_TRANSPARENT_DATA_ENCRYPTION'] = 'false';

          expectedConfig['defaultSettings']['sqldb']['transparentDataEncryption'] = false;

          keys.forEach(function (key) {
            process.env[key] = environmentVariablesToSet[key];
          });
        });

        after(function () {
          keys.forEach(function (key) {
            process.env[key] = environmentVariablesToBackup[key];
          });
        });

        it('should fetch configurations from environment variables - 5', function () {
          var actualConfig = Common.getConfigurations();
          actualConfig.should.eql(expectedConfig);
        });
      });

      describe('in case AZURE_SQLDB_ENABLE_TRANSPARENT_DATA_ENCRYPTION is not present', function () {
        before(function () {
          delete process.env['AZURE_SQLDB_ENABLE_TRANSPARENT_DATA_ENCRYPTION'];

          expectedConfig['defaultSettings']['sqldb']['transparentDataEncryption'] = false;

          keys.forEach(function (key) {
            process.env[key] = environmentVariablesToSet[key];
          });
        });

        after(function () {
          keys.forEach(function (key) {
            process.env[key] = environmentVariablesToBackup[key];
          });
        });

        it('should fetch configurations from environment variables - 3', function () {
          var actualConfig = Common.getConfigurations();
          actualConfig.should.eql(expectedConfig);
        });
      });
    });
  });

  describe('getEnvironment()', function () {
    it('should get the environment by the name', function () {
      var envName = 'AzureCloud';
      var env = Common.getEnvironment(envName);
      env.should.be.exactly(AzureEnvironment.Azure);
      envName = 'AzureChinaCloud';
      var env = Common.getEnvironment(envName);
      env.should.be.exactly(AzureEnvironment.AzureChina);
    });
  });

  describe('logHttpResponse()', function () {
    before(function () {
      sinon.stub(log, 'debug');
    });

    after(function () {
      log.debug.restore();
    });

    it('should call log.debug with correct message when logging body', function () {
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

    it('should call log.debug with correct message when not logging body', function () {
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

  describe('getToken()', function () {
    describe('when the status code of response is 200', function () {
      before(function () {
        Token.init({}, {});
        sinon.stub(request, 'post').yields(null, { statusCode: 200 }, '{"access_token": "asdasdasd"}');
      });

      after(function () {
        request.post.restore();
      });

      it('should get the token', function () {
        Token.getToken(true, function (err, token) {
          should.not.exist(err);
          token.should.be.exactly('asdasdasd');
        });
      });
    });

    describe('when the status code of response is 403', function () {
      before(function () {
        Token.init({}, {});
        sinon.stub(request, 'post').yields(null, { statusCode: 403 });
      });

      after(function () {
        request.post.restore();
      });

      it('should get an error', function () {
        Token.getToken(true, function (err, token) {
          should.exist(err);
          err.statusCode.should.equal(403);
        });
      });
    });
  });

  describe('fixNamesIfSpaceScopingEnabled()', function () {

    var vcapApplicationJson = '{ "space_id": "575e0353-f98d-4a01-8d95-26f595436af9", "space_name": "fake_space" }';
    var vcapApplicationJsonAlternate = '{ "space_id": "9811f187-dfb5-4aab-b2f0-fa4ad77e8bee", "space_name": "fake_space" }';

    var testServiceConfig = {
      'id': '405db572-c611-4496-abc3-382fe70f29d7',
      'name': 'fake-service',
      'description': 'fake service description',
      'bindable': true,
      'metadata': {
        'displayName': 'fake service display name',
        'imageUrl': 'https://cloudfoundry.blob.core.windows.net/assets/CosmosDB.png',
        'longDescription': 'fake service long description',
        'providerDisplayName': 'Microsoft'
      },
      'plans': [{
        'id': '19d433f0-ea86-4e81-84d1-92eb97e8a434',
        'name': 'fake-plan-01',
        'free': false,
        'description': 'fake-plan-01 long description',
        'metadata': {
          'bullets': [],
          'costs': [{
            'amount': {
              'usd': 0.00
            },
            'unit': 'monthly estimate'
          }],
          'displayName': 'Standard'
        }
      }, 
      {
        'id': '98d433f0-ea86-4e81-84d1-92eb97e8a545',
        'name': 'fake-plan-02',
        'free':false,
        'description': 'fake-plan-02 long description',
        'metadata': {
          'bullets': [],
          'costs': [{
            'amount': {
              'usd': 0.00
            },
            'unit': 'monthly estimate'
          }],
          'displayName': 'Standard'
        }
      }]
    };

    var expectedServiceConfig = {
      'id': 'f2a9f3f9-83c0-548f-842e-651e8260ea9a',
      'name': 'fake-service-575e0353-f98d-4a01-8d95-26f595436af9',
      'description': 'fake service description (fake_space)',
      'bindable': true,
      'metadata': {
        'displayName': 'fake service display name',
        'imageUrl': 'https://cloudfoundry.blob.core.windows.net/assets/CosmosDB.png',
        'longDescription': 'fake service long description',
        'providerDisplayName': 'Microsoft'
      },
      'plans': [{
        'id': '75272ae5-33fd-5120-9420-96866327a7f1',
        'name': 'fake-plan-01',
        'free': false,
        'description': 'fake-plan-01 long description',
        'metadata': {
          'bullets': [],
          'costs': [{
            'amount': {
              'usd': 0.00
            },
            'unit': 'monthly estimate'
          }],
          'displayName': 'Standard'
        }
      }, 
      {
        'id': 'e6f68426-1348-53db-8e8d-909275fa2b87',
        'name': 'fake-plan-02',
        'free':false,
        'description': 'fake-plan-02 long description',
        'metadata': {
          'bullets': [],
          'costs': [{
            'amount': {
              'usd': 0.00
            },
            'unit': 'monthly estimate'
          }],
          'displayName': 'Standard'
        }
      }]
    };

    context('space scoping is enabled', function () {

      before(function () {
        process.env['SPACE_SCOPING_ENABLED'] = 'true';
        process.env['VCAP_APPLICATION'] = vcapApplicationJson;
      });

      after(function () {
        // no clean-up required
      });

      it('should update service IDs, service names and plan IDs if space scoping is enabled', function () {
        var actualServiceConfig = Common.fixNamesIfSpaceScopingEnabled(underscore.clone(testServiceConfig));
        actualServiceConfig.should.eql(expectedServiceConfig);
      });

      it('should have repeatable, unique service IDs, service names and plan IDs for space-scoped instances', function () {
        var actualServiceConfigFirst = Common.fixNamesIfSpaceScopingEnabled(underscore.clone(testServiceConfig));
        var actualServiceConfigSecond = Common.fixNamesIfSpaceScopingEnabled(underscore.clone(testServiceConfig));
        
        process.env['VCAP_APPLICATION'] = vcapApplicationJsonAlternate;

        var actualServiceConfigThird = Common.fixNamesIfSpaceScopingEnabled(underscore.clone(testServiceConfig));
        var actualServiceConfigFourth = Common.fixNamesIfSpaceScopingEnabled(underscore.clone(testServiceConfig));

        actualServiceConfigFirst.should.eql(actualServiceConfigSecond);
        actualServiceConfigThird.should.eql(actualServiceConfigFourth);
      });
    });

    context('space scoping is disabled', function() {
      before(function () {
        process.env['SPACE_SCOPING_ENABLED'] = 'false';
        process.env['VCAP_APPLICATION'] = JSON.stringify(vcapApplicationJson);
      });

      after(function () {
        // no clean-up required
      });

      it('should not modify service configurations if space scoping is disabled', function() {
        var actualServiceConfig = Common.fixNamesIfSpaceScopingEnabled(underscore.clone(testServiceConfig));
        actualServiceConfig.should.eql(testServiceConfig); 
      });
    });
  });

});
