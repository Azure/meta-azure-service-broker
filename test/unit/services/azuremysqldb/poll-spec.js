/*
  good instanceId : e2778b98-0b6b-11e6-9db3-000d3a002ed5
  test: 
*/

/* jshint camelcase: false */
/* jshint newcap: false */
/* global describe, before, it */

var should = require('should');
var sinon = require('sinon');
var cmdPoll = require('../../../../lib/services/azuremysqldb/cmd-poll');
var mysqldbOperations = require('../../../../lib/services/azuremysqldb/client');
var azure = require('../helpers').azure;
var msRestRequest = require('../../../../lib/common/msRestRequest');

var mockingHelper = require('../mockingHelper');
mockingHelper.backup();

var afterProvisionValidParams = {
    instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
    service_id: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
    plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
    organization_guid: 'f4e5cad5-ce2a-4d8d-bd4e-67f52207cbc7',
    space_guid: 'e3eb2f05-c7db-4451-bc9c-fec2e57b9fc2',
    parameters: {
        resourceGroup: 'sqldbResourceGroup',
        location: 'westus',
        mysqlServerName: 'golive4',
        mysqlServerParameters: {
            'allowMysqlServerFirewallRules': [
                {
                  'ruleName': 'newrule',
                  'startIpAddress': '0.0.0.0',
                  'endIpAddress': '255.255.255.255'
                }
            ],
            properties: {
                administratorLogin: 'xxxx',
                administratorLoginPassword: 'xxxxxxx'
            }
        }
    },
    last_operation: 'provision',
    provisioning_result: {
      'resourceGroup': 'sqldbResourceGroup',
      'mysqlServerName': 'golive4',
      'serverPollingUrl': 'fake-serverPollingUrl',
      'administratorLogin': 'xxxx',
      'administratorLoginPassword': 'xxxxxxx',
    },
    azure: azure
};

var afterDeprovisionValidParams = {
    instance_id: 'e2778b98-0b6b-11e6-9db3-000d3a002ed5',
    service_id: 'fb9bc99e-0aa9-11e6-8a8a-000d3a002ed5',
    plan_id: '3819fdfa-0aaa-11e6-86f4-000d3a002ed5',
    organization_guid: 'f4e5cad5-ce2a-4d8d-bd4e-67f52207cbc7',
    space_guid: 'e3eb2f05-c7db-4451-bc9c-fec2e57b9fc2',
    parameters: {
        resourceGroup: 'sqldbResourceGroup',
        location: 'westus',
        mysqlServerName: 'golive4',
        mysqlServerParameters: {
            'allowMysqlServerFirewallRules': [
                {
                  'ruleName': 'newrule',
                  'startIpAddress': '0.0.0.0',
                  'endIpAddress': '255.255.255.255'
                }
            ],
            properties: {
                administratorLogin: 'xxxx',
                administratorLoginPassword: 'xxxxxxx'
            }
        }
    },
    last_operation: 'deprovision',
    provisioning_result: {
      'resourceGroup': 'sqldbResourceGroup',
      'mysqlServerName': 'golive4',
      'serverPollingUrl': 'fake-serverPollingUrl',
      'administratorLogin': 'xxxx',
      'administratorLoginPassword': 'xxxxxxx',
    },
    azure: azure
};

var mysqldbOps = new mysqldbOperations(azure);

describe('MySqlDb - Poll - polling mysql server immediately after creation is started', function () {

    var cp;

    before(function () {
        cp = new cmdPoll(afterProvisionValidParams);
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('fake-serverPollingUrl')
          .yields(null, {statusCode: 200}, '{"name":"8772dacd-eb4a-4a59-b81b-6af617bcc010","status":"InProgress","startTime":"2017-04-19T05:39:13.033Z"}');
    });

    after(function () {
        mockingHelper.restore();
    });

    describe('Poll immediately after starting to provision mysql server', function () {
        it('should return \'in progress\'', function (done) {
            cp.poll(mysqldbOps, function (err, result) {
                should.not.exist(err);
                result.body.resourceGroup.should.equal('sqldbResourceGroup');
                result.body.mysqlServerName.should.equal('golive4');
                result.body.administratorLogin.should.equal('xxxx');
                result.body.administratorLoginPassword.should.equal('xxxxxxx');
                result.body.serverPollingUrl.should.equal('fake-serverPollingUrl');
                
                result.value.state.should.equal('in progress');
                result.value.description.should.equal('Creating server golive4.');
                done();
            });
        });
    });
});


describe('MySqlDb - Poll - polling mysql server after creation is complete', function () {

    var mysqldbOpsGetDatabaseResult = {
        statusCode: 200,
        body: {
            name: 'mysql',
            properties: {
                userVisibleState: 'Ready',
                fullyQualifiedDomainName: 'fake-fqdn'
            }
        }
    };

    before(function () {
        msRestRequest.GET = sinon.stub();
        msRestRequest.GET.withArgs('fake-serverPollingUrl')
          .yields(null, {statusCode: 200}, '{"name":"8772dacd-eb4a-4a59-b81b-6af617bcc010","status":"Succeeded","startTime":"2017-04-19T05:39:13.033Z"}');
        msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.DBforMySQL/servers/golive4')
          .yields(null, mysqldbOpsGetDatabaseResult, JSON.stringify(mysqldbOpsGetDatabaseResult.body));
        msRestRequest.PUT = sinon.stub();
        // create firewall rule
        msRestRequest.PUT.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.DBforMySQL/servers/golive4/firewallRules/newrule')
          .yields(null, {statusCode: 202, headers: {'azure-asyncoperation': 'fake-firewall-status-url'}});
        // check firewall rule
        msRestRequest.GET.withArgs('fake-firewall-status-url')
          .yields(null, {statusCode: 200}, '{"name":"8772dacd-eb4a-4a59-b81b-6af617bcc010","status":"Succeeded","startTime":"2017-04-19T05:39:13.033Z"}');
    });

    after(function () {
        mockingHelper.restore();
    });

    describe('created server but not created firewall rules', function () {
        it('should return \'in progress\'', function (done) {
            var cp = new cmdPoll(afterProvisionValidParams);
            cp.poll(mysqldbOps, function (err, result) {
                should.not.exist(err);
                result.body.resourceGroup.should.equal('sqldbResourceGroup');
                result.body.mysqlServerName.should.equal('golive4');
                result.body.administratorLogin.should.equal('xxxx');
                result.body.administratorLoginPassword.should.equal('xxxxxxx');
                result.body.fullyQualifiedDomainName.should.equal('fake-fqdn');
                result.body.ruleStatusUrls.length.should.equal(1);
                should.not.exist(result.body.serverPollingUrl);
                
                result.value.state.should.equal('in progress');
                result.value.description.should.equal('Created server golive4. Creating firewall rules.');
                done();
            });
        });
        
    });
    
    describe('created server but not created firewall rules', function () {
        it('should return \'in progress\'', function (done) {
            delete afterProvisionValidParams.provisioning_result.serverPollingUrl;
            afterProvisionValidParams.provisioning_result.ruleStatusUrls = ['fake-firewall-status-url'];
            
            var cp = new cmdPoll(afterProvisionValidParams);
            cp.poll(mysqldbOps, function (err, result) {
                should.not.exist(err);
                result.body.resourceGroup.should.equal('sqldbResourceGroup');
                result.body.mysqlServerName.should.equal('golive4');
                result.body.administratorLogin.should.equal('xxxx');
                result.body.administratorLoginPassword.should.equal('xxxxxxx');
                result.body.fullyQualifiedDomainName.should.equal('fake-fqdn');
                result.body.ruleStatusUrls.length.should.equal(0);
                should.not.exist(result.body.serverPollingUrl);
                
                result.value.state.should.equal('succeeded');
                result.value.description.should.equal('Created server golive4. Created firewall rules.');
                done();
            });
        });
        
    });
});

describe('MySqlDb - Poll - polling mysql server after de-provision is complete', function () {

    var cp;
    
    describe('ServerPollingUrl exists', function () {
      
        before(function () {
            cp = new cmdPoll(afterDeprovisionValidParams);
            msRestRequest.GET = sinon.stub();
            msRestRequest.GET.withArgs('fake-serverPollingUrl')
              .yields(null, {statusCode: 200}, '{"name":"8772dacd-eb4a-4a59-b81b-6af617bcc010","status":"Succeeded","startTime":"2017-04-19T05:39:13.033Z"}');
        });

        after(function () {
            mockingHelper.restore();
        });

        describe('Poll get 200 from the url to check azure-asyncoperation', function () {
            it('should return success', function (done) {
                cp.poll(mysqldbOps, function (err, result) {
                    should.not.exist(err);
                    result.value.state.should.equal('succeeded');
                    result.value.description.should.equal('Server has been deleted.');
                    done();
                });
            });
        });
    });
    
    describe('ServerPollingUrl not exists', function () {
      
        before(function () {
            delete afterDeprovisionValidParams.provisioning_result.serverPollingUrl;
            cp = new cmdPoll(afterDeprovisionValidParams);
            msRestRequest.GET = sinon.stub();
            msRestRequest.GET.withArgs('https://management.azure.com//subscriptions/55555555-4444-3333-2222-111111111111/resourceGroups/sqldbResourceGroup/providers/Microsoft.DBforMySQL/servers/golive4')
                .yields(null, {statusCode: 404});
        });

        after(function () {
            mockingHelper.restore();
        });

        describe('Poll get 404 from getting server', function () {
            it('should correctly interpret 404 as server is deleted', function (done) {
                cp.poll(mysqldbOps, function (err, result) {
                    should.not.exist(err);
                    result.value.state.should.equal('succeeded');
                    result.value.description.should.equal('Server has been deleted.');
                    done();
                });
            });
        });
    });
});

