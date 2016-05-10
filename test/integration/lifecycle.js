var uuid = require('node-uuid');

var chai = require('chai');
var chaiHttp = require('chai-http');
var should = chai.should();
chai.use(chaiHttp);

var broker = require('../../brokerserver')
var server = broker.restServer;

describe('Catalog', function() {
  it('should list ALL services', function(done) {
    chai.request(server)
      .get('/v2/catalog')
      .set('X-Broker-API-Version', '2.8')
      .auth('demouser', 'demopassword')
      .end(function(err, res) {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('services');
        res.body.services.should.be.a('array');
        res.body.services.should.not.equal([]);
        done();
      });
  });
});

describe('AzureStorageBlob', function() {
  var serviceId = '2e2fc314-37b6-4587-8127-8f9ee8b33fea';
  var planId = '6ddf6b41-fb60-4b70-af99-8ecc4896b3cf';

  describe('Provisioning', function() {
    var instanceId = uuid.v4();
    var bindingId = uuid.v4();
    var resourceGroupName = 'cloud-foundry-' + instanceId;
    var storageAccountName = 'cf' + instanceId.replace(/-/g, '').slice(0, 22);

    it('should return 422 if accepts_incomplete is not set to true', function(done) {
      chai.request(server)
        .put('/v2/service_instances/' + instanceId)
        .set('X-Broker-API-Version', '2.8')
        .auth('demouser', 'demopassword')
        .send({
          "organization_guid": uuid.v4(),
          "plan_id": planId,
          "service_id": serviceId,
          "space_guid": uuid.v4(),
          "parameters": {
            "resource_group_name": resourceGroupName,
            "storage_account_name": storageAccountName,
            "location": "eastasia",
            "account_type": "Standard_RAGRS"
          }
        })
        .end(function(err, res) {
          res.should.have.status(422);
          done();
        });
    });
  });

  describe('Successful lifecycle', function() {
    var instanceId = uuid.v4();
    var bindingId = uuid.v4();
    var resourceGroupName = 'cloud-foundry-' + instanceId;
    var storageAccountName = 'cf' + instanceId.replace(/-/g, '').slice(0, 22);

    it('should create a storage account', function(done) {
      chai.request(server)
        .put('/v2/service_instances/' + instanceId)
        .set('X-Broker-API-Version', '2.8')
        .auth('demouser', 'demopassword')
        .query({
          accepts_incomplete: true
        })
        .send({
          "organization_guid": uuid.v4(),
          "plan_id": planId,
          "service_id": serviceId,
          "space_guid": uuid.v4(),
          "parameters": {
            "resource_group_name": resourceGroupName,
            "storage_account_name": storageAccountName,
            "location": "eastasia",
            "account_type": "Standard_RAGRS"
          }
        })
        .end(function(err, res) {
          res.should.have.status(202);
          done();
        });
    });

    it('should poll the state of the provisioning operation', function(done) {
      this.timeout(60000);

      setTimeout(function() {
        chai.request(server)
          .get('/v2/service_instances/' + instanceId + '/last_operation')
          .set('X-Broker-API-Version', '2.8')
          .auth('demouser', 'demopassword')
          .end(function(err, res) {
            res.should.have.status(200);
            res.body.should.have.property('state');
            done();
          });
      }, 10000);
    });

    it('should get the credentials by binding operation', function(done) {
      this.timeout(60000);

      setTimeout(function() {
        chai.request(server)
          .put('/v2/service_instances/' + instanceId + '/service_bindings/' + bindingId)
          .set('X-Broker-API-Version', '2.8')
          .auth('demouser', 'demopassword')
          .send({
            "plan_id": planId,
            "service_id": serviceId,
            "app_guid": uuid.v4(),
            "parameters": {}
          })
          .end(function(err, res) {
            res.should.have.status(201);
            res.should.be.json;
            res.body.should.be.a('object');
            res.body.should.have.property('credentials');
            res.body.credentials.should.have.property('storage_account_name');
            res.body.credentials.should.have.property('container_name');
            res.body.credentials.should.have.property('primary_access_key');
            res.body.credentials.should.have.property('secondary_access_key');
            res.body.credentials.storage_account_name.should.equal(storageAccountName);
            done();
          });
      }, 10000);
    });

    it('should delete the binding', function(done) {
      this.timeout(60000);

      setTimeout(function() {
        chai.request(server)
          .delete('/v2/service_instances/' + instanceId + '/service_bindings/' + bindingId)
          .set('X-Broker-API-Version', '2.8')
          .auth('demouser', 'demopassword')
          .query({
            service_id: serviceId,
            plan_id: planId
          })
          .end(function(err, res) {
            res.should.have.status(200);
            done();
          });
      }, 10000);
    });

    it('should delete the storage account', function(done) {
      this.timeout(60000);

      setTimeout(function() {
        chai.request(server)
          .delete('/v2/service_instances/' + instanceId)
          .set('X-Broker-API-Version', '2.8')
          .auth('demouser', 'demopassword')
          .query({
            service_id: serviceId,
            plan_id: planId
          })
          .end(function(err, res) {
            res.should.have.status(202);
            done();
          });
      }, 10000);
    });

    it('should poll the state of the deprovisioning operation', function(done) {
      this.timeout(60000);

      setTimeout(function() {
        chai.request(server)
          .get('/v2/service_instances/' + instanceId + '/last_operation')
          .set('X-Broker-API-Version', '2.8')
          .auth('demouser', 'demopassword')
          .end(function(err, res) {
            res.should.have.status(200);
            res.body.should.have.property('state');
            done();
          });
      }, 10000);
    });

  });

});
