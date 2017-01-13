var _ = require('underscore');
var uuid = require('node-uuid');
var async = require('async');
var chai = require('chai');
var chaiHttp = require('chai-http');
var should = chai.should();
chai.use(chaiHttp);

var testMatrix = require('./test-matrix');

var broker = require('../../brokerserver')
var server = broker.restServer;
var clients = require('../utils/clients');
var statusCode = require('../utils/statusCode');

var lifecycle = function(service) {
  var serviceName = service.serviceName;
  var serviceId = service.serviceId;
  var planId = service.planId;
  var instanceId = service.instanceId;
  var bindingId = service.bindingId;
  var provisioningParameters = service.provisioningParameters;
  var bindingParameters = service.bindingParameters;
  var credentials = service.credentials;
  var e2e = service.e2e;
  
  describe(serviceName, function() {
    describe('Provisioning', function() {
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
            "parameters": provisioningParameters
          })
          .end(function(err, res) {
            res.should.have.status(422);
            done();
          });
      });
    });
  
    describe('Successful lifecycle', function() {
      it('should provision a service instance successfully', function(done) {
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
            "parameters": provisioningParameters
          })
          .end(function(err, res) {
            res.should.have.status(202);
            done();
          });
      });
  
      it('should get a conflict error if the resource name is same', function(done) {
        // The instance is different because it's a different service instance
        chai.request(server)
          .put('/v2/service_instances/' + uuid.v4())
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
            "parameters": provisioningParameters
          })
          .end(function(err, res) {
            res.should.have.status(409);
            done();
          });
      });

      it('should poll the state of the provisioning operation', function(done) {
        this.timeout(3600000);
        var state = 'in progress';
        async.whilst(
          function() {
            return state === 'in progress';
          },
          function(callback) {
            setTimeout(function() {
              chai.request(server)
                .get('/v2/service_instances/' + instanceId + '/last_operation')
                .set('X-Broker-API-Version', '2.8')
                .auth('demouser', 'demopassword')
                .end(function(err, res) {
                  res.should.have.status(200);
                  res.body.should.have.property('state');
                  state = res.body.state;
                  callback(err, state);
                });
            }, 30000);
          },
          function (err, state) {
            should.not.exist(err);
            state.should.equal('succeeded');
            done();
          }
        );
      });
  
      it('should get the credentials by the binding operation and the credentials should be workable', function(done) {
        this.timeout(300000);
  
        setTimeout(function() {
          chai.request(server)
            .put('/v2/service_instances/' + instanceId + '/service_bindings/' + bindingId)
            .set('X-Broker-API-Version', '2.8')
            .auth('demouser', 'demopassword')
            .send({
              "plan_id": planId,
              "service_id": serviceId,
              "app_guid": uuid.v4(),
              "parameters": bindingParameters
            })
            .end(function(err, res) {
              res.should.have.status(201);
              res.should.be.json;
              res.body.should.be.a('object');
              res.body.should.have.property('credentials');
              var actualCredentials = res.body.credentials;
              var keys = _.keys(credentials);
              _.each(keys, function(key) {
                res.body.credentials.should.have.property(key);
                var value = credentials[key];
                if (_.isString(value) && value.startsWith('<') && value.endsWith('>')) {
                  res.body.credentials.should.have.property(key).be.a(value.slice(1, -1));
                } else {
                  res.body.credentials.should.have.property(key, value);
                }
              }); 
              if (e2e) {
                client = clients[serviceName];
                if(client) {
                  client.validateCredential(actualCredentials, function(result) {
                    result.should.equal(statusCode.PASS);
                    done();
                  });
                } else {
                  console.warn("E2E tests for %s are skipped because the client to validate credentials is not implemented.", serviceName);
                  done();
                }
              } else done();
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
  
      it('should deprovision the service instance successfully', function(done) {
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
        this.timeout(3600000);
        var state = 'in progress';
        async.whilst(
          function() {
            return state === 'in progress';
          },
          function(callback) {
            setTimeout(function() {
              chai.request(server)
                .get('/v2/service_instances/' + instanceId + '/last_operation')
                .set('X-Broker-API-Version', '2.8')
                .auth('demouser', 'demopassword')
                .end(function(err, res) {
                  res.should.have.status(200);
                  res.body.should.have.property('state');
                  state = res.body.state;
                  callback(err, state);
                });
            }, 30000);
          },
          function (err, state) {
            should.not.exist(err);
            state.should.equal('succeeded');
            done();
          }
        );
      });
  
    });
  
  });

}

_.each(testMatrix, lifecycle);
