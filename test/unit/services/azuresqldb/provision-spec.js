/*
  good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var _ = require('underscore');
var logule = require('logule');
var should = require('should');
var sinon = require('sinon');
var cmdProvision = require('../../../../lib/services/azuresqldb/cmd-provision');
var redisClient = require('../../../../lib/services/azuresqldb/client');
var resourceGroupClient = require('../../../../lib/common/resourceGroup-client');

var azure = {
    environment: 'AzureCloud',
    subscription_id: '743fxxxx-83xx-46xx-xx2d-xxxxb953952d',
    tenant_id: '72xxxxbf-8xxx-xxxf-9xxb-2d7cxxxxdb47',
    client_id: 'd8xxxx18-xx4a-4xx9-89xx-9be0bfecxxxx',
    client_secret: '2/DzYYYYYYYYYYsAvXXXXXXXXXXQ0EL7WPxEXX115Go=',
};
  
var log = logule.init(module, 'SqlDb-Mocha');

describe('SqlDb - Provision - PreConditions', function() {
    var validParams = {};
    var cp;
        
    before(function() {
        validParams = {
            instance_id : 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            DebugLogOn: true,
            parameters : {
                resourceGroup: 'sqldbResourceGroup',
                sqlServerName: 'golive',
                sqlServerCreateIfNotExist: true,
                sqlServerParameters: {
                    location: 'westus',
                    properties: {
                        version: '12.0',
                        administratorLogin: 'greg',
                        administratorLoginPassword: 'P@ssw0rd!'
                    }
                },
                sqldbName: 'goliveSqlDb',
                sqldbParameters: {
                    properties: {
                        createMode:'Default',
                        edition:'Basic',
                        collation:'SQL_Latin1_General_CP1_CI_AS',
                        maxSizeBytes:'2147483648',
                        requestedServiceObjectiveName:'Basic'
                    }
                }
            },
            azure : azure
        };
        cp = new cmdProvision(log, validParams);
    });
    
    describe('Provision should succeed if ...', function() {
        it('all validators succeed', function(done) {
            (cp.allValidatorsSucceed()).should.equal(true);
            done();        
        });        
    });
});

describe('SqlDb - Provision - Invalid PreConditions - missing parameters file', function() {
    var validParams = {};
    var cp;
        
    before(function() {
        validParams = {
            instance_id : 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
            DebugLogOn: true,
            azure : azure
        };
        cp = new cmdProvision(log, validParams);
    });
    
    describe('Provision should fail if ...', function() {
        it('parameters file is not provided', function(done) {
            (cp.allValidatorsSucceed()).should.equal(false);
            done();        
        });        
    });
});
