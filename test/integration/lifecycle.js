/*jshint expr: true*/
var _ = require('underscore');
var uuid = require('uuid');
var async = require('async');
var chai = require('chai');
var chaiHttp = require('chai-http');
var should = chai.should();
chai.use(chaiHttp);

var clients = require('../utils/clients');
var statusCode = require('../utils/statusCode');

var cleaner = require('./cleaner');

function runLifecycle(testMatrix) {
  var lifecycle = function(service) {
    // Invalidate node cache
    delete require.cache[require.resolve('../../brokerserver')];
    delete require.cache[require.resolve('../../lib/broker/v2/')];
    delete require.cache[require.resolve('../../lib/broker/v2/api-handlers')];

    if (service.envVars) {
      var envVars = service.envVars;
      for (var key in envVars) {
        if (envVars.hasOwnProperty(key)) {
          process.env[key] = envVars[key];
        }
      }
    }

    var broker = require('../../brokerserver');
    var server = broker.restServer;

    // lifecycle
    var serviceName = service.serviceName;
    var serviceId = service.serviceId;
    var planId = service.planId;
    var instanceId = service.instanceId;
    var bindingId = service.bindingId;
    var provisioningParameters = service.provisioningParameters;
    var bindingParameters = service.bindingParameters;
    var credentials = service.credentials;
    var e2e = service.e2e;
    var client = clients[serviceName];

    describe(serviceName, function() {
      describe('Provisioning', function() {
        it('should return 422 if accepts_incomplete is not set to true', function(done) {
          chai.request(server)
          .put('/v2/service_instances/' + instanceId)
          .set('X-Broker-API-Version', '2.8')
          .auth('demouser', 'demopassword')
          .send({
            'organization_guid': uuid.v4(),
            'plan_id': planId,
            'service_id': serviceId,
            'space_guid': uuid.v4(),
            'parameters': provisioningParameters
          })
          .end(function(err, res) {
            res.should.have.status(422);
            done();
          });
        });
      });

      describe('Successful lifecycle', function() {
        it('should do preProvision successfully', function(done) {
          this.timeout(150000);
          if (service.preProvision) {
            service.preProvision(done);
          } else {
            done();
          }
        });

        it('should provision a service instance successfully', function(done) {
          this.timeout(60000);
          chai.request(server)
          .put('/v2/service_instances/' + instanceId)
          .set('X-Broker-API-Version', '2.8')
          .auth('demouser', 'demopassword')
          .query({
            'accepts_incomplete': true
          })
          .send({
            'organization_guid': uuid.v4(),
            'plan_id': planId,
            'service_id': serviceId,
            'space_guid': uuid.v4(),
            'parameters': provisioningParameters
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
            'accepts_incomplete': true
          })
          .send({
            'organization_guid': uuid.v4(),
            'plan_id': planId,
            'service_id': serviceId,
            'space_guid': uuid.v4(),
            'parameters': provisioningParameters
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
              setTimeout(function () {
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

        it('should validate the provisioning operation', function(done) {
          this.timeout(60000);
          var test = this;
          if(client && client.validateProvisioning) {
            client.validateProvisioning(service, done);
          } else {
            test.skip();
          }
        });

        it('should get the credentials by the binding operation and the credentials should be workable', function(done) {
          this.timeout(300000);

          chai.request(server)
          .put('/v2/service_instances/' + instanceId + '/service_bindings/' + bindingId)
          .set('X-Broker-API-Version', '2.8')
          .auth('demouser', 'demopassword')
          .send({
            'plan_id': planId,
            'service_id': serviceId,
            'app_guid': uuid.v4(),
            'parameters': bindingParameters
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
            if (e2e === false) {
              done();
            } else {
              if(client) {
                client.validateCredential(actualCredentials, function(result) {
                  result.should.equal(statusCode.PASS);
                  done();
                });
              } else {
                console.warn('E2E tests for %s are skipped because the client to validate credentials is not implemented.', serviceName);
                done();
              }
            }
          });
        });

        it('should update the service instance', function(done){
          // Limit the duration of this test to 60s
          this.timeout(60000);
          var test = this;

          // Skip update if the plan does not support it
          if (!service.updatingParameters){
            test.skip();
          }

          var updatePlanId = service.updatePlanId;
          if (!updatePlanId) updatePlanId = planId;
          chai.request(server)
          .patch('/v2/service_instances/' + instanceId)
          .set('X-Broker-API-Version', '2.8')
          .auth('demouser', 'demopassword')
          .query({
            'accepts_incomplete': true
          }).send({
            'organization_guid': uuid.v4(),
            'plan_id': updatePlanId,
            'service_id': serviceId,
            'space_guid': uuid.v4(),
            'parameters':service.updatingParameters
          })
          .end(function (err, res) {
            res.status.should.be.oneOf([200, 202]);
            done(err);
          });
        });

        it('should validate the update operation', function (done) {
          this.timeout(60000);

          var test = this;
          if (client && client.validateUpdate) {
            client.validateUpdate(service, done);
          } else {
            test.skip();
          }
        });

        it('should delete the binding', function(done) {
          this.timeout(60000);

          chai.request(server)
          .delete('/v2/service_instances/' + instanceId + '/service_bindings/' + bindingId)
          .set('X-Broker-API-Version', '2.8')
          .auth('demouser', 'demopassword')
          .query({
            'service_id': serviceId,
            'plan_id': planId
          })
          .end(function(err, res) {
            res.should.have.status(200);
            done();
          });
        });

        it('should deprovision the service instance successfully', function(done) {
          this.timeout(60000);

          chai.request(server)
          .delete('/v2/service_instances/' + instanceId)
          .set('X-Broker-API-Version', '2.8')
          .auth('demouser', 'demopassword')
          .query({
            'service_id': serviceId,
            'plan_id': planId
          })
          .end(function(err, res) {
            res.should.have.status(202);
            done();
          });
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

        it('should call cleaner in the last', function(done) {
          this.timeout(60000);
          cleaner.clean(provisioningParameters, done);
        });
      });

    });

  };

  _.each(testMatrix, lifecycle);
}

runLifecycle(require('./test-matrix'));

// Rerun lifecycle tests without the ability to create SQL servers
process.env['AZURE_SQLDB_ALLOW_TO_CREATE_SQL_SERVER'] = 'false';

runLifecycle(require('./test-matrix2'));
