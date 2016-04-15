/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var _ = require('underscore');
var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var cmdPoll = require('../../../lib/services/azuredocdb/cmd-poll');
var docDbClient = require('../../../lib/services/azuredocdb/client');

var log = logule.init(module, 'DocumentDb-Tests');

var azure = {
    environment: 'AzureCloud',
    subscription_id: '743fxxxx-83xx-46xx-xx2d-xxxxb953952d',
    tenant_id: '72xxxxbf-8xxx-xxxf-9xxb-2d7cxxxxdb47',
    client_id: 'd8xxxx18-xx4a-4xx9-89xx-9be0bfecxxxx',
    client_secret: '2/DzYYYYYYYYYYsAvXXXXXXXXXXQ0EL7WPxEXX115Go=',
};

describe('DocumentDb - Poll - PreConditions', function() {
    var validParams;
        
    before(function() {
       
        validParams = {
            instance_id : '2e201389-35ff-4b89-9148-5c08c7325dc8',
            parameters : {
                resourceGroup: 'docDbResourceGroup',
                docDbName: 'goliveDocDb'
            },
            provisioning_result: '{\"id\":\"goliveDocDb\"}'
        };
    });
    
    describe('Poll should succeed if ...', function() {
        it('all validators succeed', function(done) {
            var cp = new cmdPoll(log, validParams);
            (cp.allValidatorsSucceed()).should.equal(true);
            done();        
        });
        
    });
});

describe('DocumentDb - Poll - Execution - docDb that exists', function() {
    var validParams;
        
    before(function() {
        validParams = {
            instance_id : '2e201389-35ff-4b89-9148-5c08c7325dc8',
            parameters : {
                resourceGroup: 'docDbResourceGroup',
                docDbName: 'goliveDocDb'
            },
            provisioning_result: '{\"id\":\"goliveDocDb\", \"_self\":\"dbs/a00AAA==/\"}',
            last_operation : "provision",
        };
    });
    
    after(function() {
        docDbClient.poll.restore();
    });
    
    describe('Poll operation outcomes should be...', function() {
        it('should output state = succeeded', function(done) {

            var cp = new cmdPoll(log, validParams);
            (cp.allValidatorsSucceed()).should.equal(true);
            
            sinon.stub(docDbClient, 'poll').yields(null, {_self : 'dbs/a00AAA==/'});
            cp.poll(docDbClient, function(err, reply) {
                should.not.exist(err);
                reply.value.state.should.equal('succeeded');
                done();        
            });
            
        });
    });
});