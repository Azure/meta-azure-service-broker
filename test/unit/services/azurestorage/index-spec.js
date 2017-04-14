/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var uuid = require('uuid');
var service = require('../../../../lib/services/azurestorage/service.json');
var handlers = require('../../../../lib/services/azurestorage/index');
var storageClient = require('../../../../lib/services/azurestorage/storageclient');

var azure = {
  environment: 'AzureCloud',
  subscriptionId: '743fxxxx-83xx-46xx-xx2d-xxxxb953952d',
  tenantId: '72xxxxbf-8xxx-xxxf-9xxb-2d7cxxxxdb47',
  clientId: 'd8xxxx18-xx4a-4xx9-89xx-9be0bfecxxxx',
  clientSecret: '2/DzYYYYYYYYYYsAvXXXXXXXXXXQ0EL7WPxEXX115Go=',
};

var generatedValidInstanceId = uuid.v4();

var resourceGroupName = 'fake-resource-group';
var storageAccountName = 'fakestorageaccountname';
var location = 'East Asia';
var accountType = 'Standard_LRS';
var tags = {
  'foo': 'bar'
};

var groupParameters = {
  location: location
};
var accountParameters = {
  location: location,
  accountType: accountType,
  tags: tags,
};

var provisioningResult = {
  resourceGroupResult: {
    resourceGroupName: resourceGroupName,
    groupParameters: {
      location: location
    }
  },
  storageAccountResult: {
    storageAccountName: storageAccountName,
    accountParameters: {
      location: location,
      accountType: accountType,
      tags: tags
    }
  }
};

var parameters = {
  resource_group_name: resourceGroupName,
  storage_account_name: storageAccountName,
  location: location,
  account_type: accountType
};

describe('Storage - Index - Provision', function() {
  var validParams;

  before(function() {
    validParams = {
      instance_id: generatedValidInstanceId,
      service_id: service.id,
      plan_id: service.plans[0].id,
      last_operation: 'provision',
      azure: azure,
      parameters: parameters
    };
  });

  after(function() {
    storageClient.provision.restore();
  });

  describe('Provision operation should succeed', function() {
    it('should not return an error and statusCode should be 202', function(done) {

      sinon.stub(storageClient, 'provision').yields(null, {
        resourceGroupResult: {
          resourceGroupName: resourceGroupName,
          groupParameters: groupParameters,
        },
        storageAccountResult: {
          storageAccountName: storageAccountName,
          accountParameters: accountParameters,
        }
      });
      handlers.provision(validParams, function(err, reply, result) {
        should.not.exist(err);
        reply.statusCode.should.equal(202);
        result.should.eql(provisioningResult);
        done();
      });

    });
  });
});

describe('Storage - Index - Poll existing storage', function() {
  var validParams;

  before(function() {
    validParams = {
      instance_id: generatedValidInstanceId,
      service_id: service.id,
      plan_id: service.plans[0].id,
      last_operation: 'provision',
      provisioning_result: provisioningResult,
      azure: azure,
      parameters: parameters
    };
  });

  after(function() {
    storageClient.poll.restore();
  });

  describe('Poll operation should succeed for existing storage', function() {
    it('should not return an error and statusCode should be 200', function(done) {

      sinon.stub(storageClient, 'poll').yields(null, {
        provisioningState: 'Succeeded'
      });
      handlers.poll(validParams, function(err, lastOperatoin, reply, result) {
        should.not.exist(err);
        lastOperatoin.should.equal('provision');
        reply.statusCode.should.equal(200);
        done();
      });

    });
  });
});

describe('Storage - Index - Bind existing storage', function() {
  var validParams;

  before(function() {
    validParams = {
      instance_id: generatedValidInstanceId,
      service_id: service.id,
      plan_id: service.plans[0].id,
      last_operation: 'provision',
      provisioning_result: provisioningResult,
      azure: azure,
      parameters: parameters
    };
  });

  after(function() {
    storageClient.bind.restore();
  });

  describe('Bind operation should succeed for existing storage', function() {
    it('should not return an error and statusCode should be 201', function(done) {

      sinon.stub(storageClient, 'bind').withArgs(resourceGroupName, storageAccountName).yields(null, 'fake-key-1', 'fake-key-2');

      handlers.bind(validParams, function(err, reply, result) {
        should.not.exist(err);
        reply.statusCode.should.equal(201);
        reply.code.should.equal('Created');
        reply.value.credentials.primary_access_key.should.equal('fake-key-1');
        reply.value.credentials.secondary_access_key.should.equal('fake-key-2');
        done();
      });

    });
  });
});

describe('Storage - Index - De-provision existing storage', function() {
  var validParams;

  before(function() {
    validParams = {
      instance_id: generatedValidInstanceId,
      service_id: service.id,
      plan_id: service.plans[0].id,
      last_operation: 'provision',
      provisioning_result: provisioningResult,
      azure: azure
    };
  });

  after(function() {
    storageClient.deprovision.restore();
  });

  describe('De-Provision operation should succeed for existing storage', function() {
    it('should not return an error and statusCode should be 202', function(done) {

      sinon.stub(storageClient, 'deprovision').yields(null, {
        provisioningState: 'Succeeded'
      });
      handlers.deprovision(validParams, function(err, reply, result) {
        should.not.exist(err);
        reply.statusCode.should.equal(202);
        done();
      });

    });
  });
});

describe('Storage - Index - Poll de-provisioned storage', function() {
  var validParams;

  before(function() {
    validParams = {
      instance_id: generatedValidInstanceId,
      service_id: service.id,
      plan_id: service.plans[0].id,
      last_operation: 'deprovision',
      provisioning_result: provisioningResult,
      azure: azure,
      parameters: parameters
    };
  });

  after(function() {
    storageClient.poll.restore();
  });

  describe('Poll operation should succeed for de-provisioned storage', function() {
    it('should not return an error and statusCode should be 200', function(done) {

      sinon.stub(storageClient, 'poll').yields(null, {
        statusCode: 404
      });
      handlers.poll(validParams, function(err, lastOperatoin, reply, result) {
        should.not.exist(err);
        lastOperatoin.should.equal('deprovision');
        reply.statusCode.should.equal(200);
        done();
      });

    });
  });
});

