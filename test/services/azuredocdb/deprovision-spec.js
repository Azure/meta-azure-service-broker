/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var _ = require('underscore');
var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var common = require('../../../lib/common');
var cmdDeprovision = require('../../../lib/services/azuredocdb/cmd-deprovision');
var redisClient = require('../../../lib/services/azuredocdb/client');

var log = logule.init(module, 'DocumentDb-Tests');

describe('DocumentDb - Deprovision - PreConditions', function() {
    var cp;
        
    before(function() {
        var validParams = {
            instance_id : '2e201389-35ff-4b89-9148-5c08c7325dc8',
            provisioning_result: '{\"id\":\"goliveDocDb\",\"_self\":\"dbs/a00AAA==/\"}'
        };
        cp = new cmdDeprovision(log, validParams);
    });
    
    describe('Deprovision should succeed if ...', function() {
        it('all validators succeed', function(done) {
            (cp.allValidatorsSucceed()).should.equal(true);
            done();        
        });        
    });
});

