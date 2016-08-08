var should = require('should');
var AzureEnvironment = require('ms-rest-azure').AzureEnvironment;

var Common = require('../../../lib/common');

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

});
