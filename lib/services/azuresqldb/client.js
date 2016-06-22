/* jshint camelcase: false */
/* jshint newcap: false */

var AzureMgmtSqlDb = require('./sqldb');

var sqldb;

exports.instantiate = function (log, azure) {

    var baseUri = 'https://management.azure.com/';    
    if (azure.environment === 'AzureChinaCloud') {
        baseUri = 'https://management.chinacloudapi.cn/';        
    }

    var sd = new AzureMgmtSqlDb(azure, baseUri);
    sqldb = sd.sqldb;
};

exports.provision = function (resourceGroup, cacheName, parameters, next) {

};

exports.poll = function (resourceGroup, cacheName, next) {

};

exports.deprovision = function (resourceGroup, cacheName, next) {

};

exports.bind = function (next) {

};

exports.unbind = function (next) {

};

