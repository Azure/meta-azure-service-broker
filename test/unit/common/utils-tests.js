var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var util = require('util');
var AzureEnvironment = require('ms-rest-azure').AzureEnvironment;

var Common = require('../../../lib/common');
var log = logule.init(module, 'ServiceBroker-Mocha');

describe('Util', function() {

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
                               'body': 'ddd'
                             },
                             operation,
                             true);

      var message = util.format('receive from: %s\n%s: %s\n%s: %s\n%s: %s\n%s: %s\n',
                                operation,
                                'x-ms-request-id', 'aaa',
                                'x-ms-correlation-request-id', 'bbb',
                                'x-ms-routing-request-id', 'ccc',
                                'body', 'ddd');
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
});
