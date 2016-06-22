/*jshint camelcase: false */
/*jshint newcap: false */

'use strict';

var request = require('request');

var API_VERSION_FOR_TOKEN = '2015-05-01-preview';
var API_VERISON_FOR_RESOURCE_GROUP = '2015-11-01';
var API_VERSION_FOR_SQL = '2014-04-01-preview';

String.prototype.format = function() {
    var formatted = this;
    for( var arg in arguments ) {
        formatted = formatted.replace("{" + arg + "}", arguments[arg]);
    }
    return formatted;
};



var azureRestOps = function(log, apiVersion) {
    this.log = log;

    this.apiVersion = arguments[1] ? arguments[1] : '2015-05-01-preview';
    this.qs = {"api-version" : this.apiVersion};

    this.initiate = function(callback) {
        //Do Nothing;
    }

}

azureRestOps.prototype.GET = function(url, headers, callback) {
    request({
        url:       url,
        qs:        this.qs,
        method:    'GET',
        headers:   headers
    }, function(err, response, body) {
       //if (err) retry?
        callback(err, response, body);
    });
}


/* post, request format: json*/
azureRestOps.prototype.POST = function(url, headers, data, callback) {
    request({
        url:       url,
        qs:        this.qs,
        method:    'POST',
        headers:   headers,
        json:      data 
    }, function(err, response, body) {
       //if (err) retry?
        callback(err, response, body);
    });

}


/* put, request format: json*/
azureRestOps.prototype.PUT = function(url, headers, data, callback) {
    request({
        url:       url,
        qs:        this.qs,
        method:    'PUT',
        headers:   headers,
        json:      data 
    }, function(err, response, body) {
       //if (err) retry?
        callback(err, response, body);
    });

}

azureRestOps.prototype.DELETE = function(url, headers, callback) {
    request({
        url:        url,
        qs:         this.qs,
        method:     'DELETE',
        headers:    headers
    }, function(err, response, body){
       //if (err) retry?        
        callback(err, response, body);
    });
}

module.exports = azureRestOps;
