/*
 * Cloud Foundry Services Connector
 * Copyright (c) 2014 ActiveState Software Inc. All rights reserved.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

'use strict';

var Net = require('net');
var Url = require('url');

/* Extends an objects properties with anothers */
module.exports.extend = function(target, source) {
    if (source) {
        for (var key in source) {
            var val = source[key];
            if (typeof val !== 'undefined') {
                target[key] = val;
            }
        }
    }
    return target;
};

/* set the gateway url to "auto" to automatically detect the url using this
*  function */
module.exports.detectBrokerIP = function(cloudControllerUri, cb) {

    var ccUrl = Url.parse(cloudControllerUri);

    var conn = Net.createConnection( { port: ccUrl.port || 80, host: ccUrl.host } );

    conn.on('connect', function() {
        var ra = conn.localAddress;
        conn.end();
        cb(null, ra);
    });

    conn.on('error', function(err) {
        cb(err);
    });

    conn.on('timeout', function(err) {
        cb(err);
    });

};

module.exports.epochSeconds = function() {
    return Math.round(new Date().getTime()/1000.0);
};
