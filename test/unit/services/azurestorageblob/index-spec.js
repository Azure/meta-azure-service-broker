/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var _ = require('underscore');
var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var uuid = require('node-uuid');
var service = require('../../../../lib/services/azurestorageblob/service.json');
var handlers = require('../../../../lib/services/azurestorageblob/index');
var storageBlobClient = require('../../../../lib/services/azurestorageblob/storageblobclient');

var azure = {
  environment: 'AzureCloud',
  subscription_id: '743fxxxx-83xx-46xx-xx2d-xxxxb953952d',
  tenant_id: '72xxxxbf-8xxx-xxxf-9xxb-2d7cxxxxdb47',
  client_id: 'd8xxxx18-xx4a-4xx9-89xx-9be0bfecxxxx',
  client_secret: '2/DzYYYYYYYYYYsAvXXXXXXXXXXQ0EL7WPxEXX115Go=',
};

var log = logule.init(module, 'Storage Blob-Tests');
var generatedValidInstanceId = uuid.v4();

var resourceGroupName = 'fake-resource-group';
var storageAccountName = 'fakestorageaccountname';
var containerName = 'fakecontainername';
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

describe('StorageBlob - Index - Provision', function() {
  var validParams;

  before(function() {
    validParams = {
      instance_id: generatedValidInstanceId,
      service_id: service.id,
      plan_id: service.plans[0].id,
      last_operation: 'provision',
      azure: azure,
      parameters: parameters
    }
  });

  after(function() {
    storageBlobClient.provision.restore();
  });

  describe('Provision operation should succeed', function() {
    it('should not return an error and statusCode should be 202', function(done) {

      sinon.stub(storageBlobClient, 'provision').yields(null, {
        resourceGroupResult: {
          resourceGroupName: resourceGroupName,
          groupParameters: groupParameters,
        },
        storageAccountResult: {
          storageAccountName: storageAccountName,
          accountParameters: accountParameters,
        }
      });
      handlers.provision(log, validParams, function(err, reply, result) {
        should.not.exist(err);
        reply.statusCode.should.equal(202);
        result.should.eql(provisioningResult);
        done();
      });

    });
  });
});

describe('StorageBlob - Index - Poll existing storage blob', function() {
  var validParams;

  before(function() {
    validParams = {
      instance_id: generatedValidInstanceId,
      service_id: service.id,
      plan_id: service.plans[0].id,
      last_operation: 'provision',
      provisioning_result: JSON.stringify(provisioningResult),
      azure: azure,
      parameters: parameters
    }
  });

  after(function() {
    storageBlobClient.poll.restore();
  });

  describe('Poll operation should succeed for existing storage blob', function() {
    it('should not return an error and statusCode should be 200', function(done) {

      sinon.stub(storageBlobClient, 'poll').yields(null, {
        provisioningState: 'Succeeded'
      });
      handlers.poll(log, validParams, function(err, lastOperatoin, reply, result) {
        should.not.exist(err);
        lastOperatoin.should.equal('provision');
        reply.statusCode.should.equal(200);
        done();
      });

    });
  });
});

describe('StorageBlob - Index - Bind existing storage blob', function() {
  var validParams;

  parameters.container_name = containerName;

  before(function() {
    validParams = {
      instance_id: generatedValidInstanceId,
      service_id: service.id,
      plan_id: service.plans[0].id,
      last_operation: 'provision',
      provisioning_result: JSON.stringify(provisioningResult),
      azure: azure,
      parameters: parameters
    }
  });

  after(function() {
    storageBlobClient.bind.restore();
  });

  describe('Bind operation should succeed for existing storage blob', function() {
    it('should not return an error and statusCode should be 201', function(done) {

      sinon.stub(storageBlobClient, 'bind').withArgs(resourceGroupName, storageAccountName, containerName).yields(null, 'fake-key-1', 'fake-key-2');

      handlers.bind(log, validParams, function(err, reply, result) {
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

describe('StorageBlob - Index - De-provision existing storage blob', function() {
  var validParams;

  before(function() {
    validParams = {
      instance_id: generatedValidInstanceId,
      service_id: service.id,
      plan_id: service.plans[0].id,
      last_operation: 'provision',
      provisioning_result: JSON.stringify(provisioningResult),
      azure: azure
    }
  });

  after(function() {
    storageBlobClient.deprovision.restore();
  });

  describe('De-Provision operation should succeed for existing storage blob', function() {
    it('should not return an error and statusCode should be 202', function(done) {

      sinon.stub(storageBlobClient, 'deprovision').yields(null, {
        provisioningState: 'Succeeded'
      });
      handlers.deprovision(log, validParams, function(err, reply, result) {
        should.not.exist(err);
        reply.statusCode.should.equal(202);
        done();
      });

    });
  });
});

describe('StorageBlob - Index - Poll de-provisioned storage blob', function() {
  var validParams;

  before(function() {
    validParams = {
      instance_id: generatedValidInstanceId,
      service_id: service.id,
      plan_id: service.plans[0].id,
      last_operation: 'deprovision',
      provisioning_result: JSON.stringify(provisioningResult),
      azure: azure,
      parameters: parameters
    }
  });

  after(function() {
    storageBlobClient.poll.restore();
  });

  describe('Poll operation should succeed for de-provisioned storage blob', function() {
    it('should not return an error and statusCode should be 200', function(done) {

      sinon.stub(storageBlobClient, 'poll').yields(null, {
        statusCode: 404
      });
      handlers.poll(log, validParams, function(err, lastOperatoin, reply, result) {
        should.not.exist(err);
        lastOperatoin.should.equal('deprovision');
        reply.statusCode.should.equal(200);
        done();
      });

    });
  });
});
