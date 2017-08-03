var Db = require('../../lib/broker/db');
var common = require('../../lib/common');
var opts = common.getConfigurations();
var log = require('winston');
var should = require('should/as-function');
var _ = require('underscore');
var async = require('async');
var sinon = require('sinon');
var broker = require('../../brokerserver');

var instance = {
    'azureInstanceId': 'azure-sqldb-user-mysqlsvr-mydb',
    'status': 'pending',
    'timestamp': '2017-03-24T04:51:49.466Z',
    'instance_id': 'fc120c09-652a-496d-adb8-2a7cff96dc75',
    'service_id': 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
    'plan_id': '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
    'organization_guid': 'b499ecff-378e-4e48-ae13-6e027ac9edf4',
    'space_guid': 'fba5706c-74c2-448d-9fc7-ce3f0500557e',
    'parameters': {
        'location': 'westus',
        'resourceGroup': 'user-rg1',
        'sqlServerName': 'user-mysqlsvr',
        'sqlServerParameters': {
            'properties': {
                'administratorLogin': 'user',
                'administratorLoginPassword': 'currentPassword425'
            }
        }
    },
    'last_operation': 'provision',
    'provisioning_result': {
        'administratorLogin': 'user',
        'administratorLoginPassword': 'currentPassword425'
    },
    'state': {}
};

describe('Broker', function(){

    var updateBrokerSQLCrededentialsStub;

    before(function(){
        updateBrokerSQLCrededentialsStub = sinon.stub(broker, 'updateBrokerSQLCrededentials');
    });

    it('should start', function (done) {
        broker.start();
        setTimeout(function(){
            broker.stop();
            // should(updateBrokerSQLCrededentialsStub.calledOnce).be.true();
            done();
        }, 2000);
    });

    after(function(){
        updateBrokerSQLCrededentialsStub.restore();
    });
});

describe('UpdateSQLCredentials', function(){
    it('should update sql credentials on startup.', function (done) {
        var sqldbpool = {
            'user-mysqlsvr': {
                'resourceGroup': 'user-rg1',
                'location': 'westus',
                'administratorLogin': 'user',
                'administratorLoginPassword': 'newerPassword843'
            }
        };

        broker.updateBrokerSQLCrededentials(sqldbpool, done);
    });
});


describe('Broker DB', function () {
    var db = new Db(opts.database);

    it('should be able to createServiceInstance', function(done){
        db.createServiceInstance(instance, done);
    });

    it('should be able to get service instance', function(done){
        db.getServiceInstance(instance['instance_id'], function(err, result){
            var toOmit = ['provisioning_result', 'timestamp'];
            var resultClean = _.omit(result, toOmit);
            var expected = _.omit(instance, toOmit);
            should(resultClean).deepEqual(expected);
            done(err);
        });
    });

    it('should not find an unexisting instance', function(done) {
        var badUUID = '54c4c2c2-8b01-4a9f-89b4-2e2663a43fed';
        db.getServiceInstance(badUUID, function (err, result) {
            should.not.exist(result);
            should(err.statusCode).equal(500);
            done();
        });
    });

    it('should be able to update last operation', function (done) {
        async.waterfall([
            function(callback){
                db.updateServiceInstanceDeprovisioningResult(instance['instance_id'], 'newLastOperation', JSON.stringify(instance['provisioning_result']), callback);
            },
            function(callback){
                db.getServiceInstance(instance['instance_id'], callback);
            },
            function(result, callback){
                should.exist(result);
                should(result['last_operation']).equal('newLastOperation');
                callback(null);
            }
        ],
        function (err){
            done(err);
        });
    });

    it('should be able get all service instances', function (done) {
        log.info('%j', db);
        db.getServiceInstances(function (err, result) {
            should(result.length).be.aboveOrEqual(1);
            done(err);
        });
    });

    it('should be able to setServiceInstance', function (done) {
        db.setServiceInstance(instance, done);
    });

    it('should delete service instance', function(done){
        db.deleteServiceInstance(instance['instance_id'], done);
    });

});
