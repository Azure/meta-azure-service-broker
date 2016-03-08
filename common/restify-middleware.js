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

var Logule = require('logule');

module.exports.requestLogger = function (opts) {

    var log = Logule.init(module, opts.prefix);

    return function (req, res, next) {
        res.on('finish', function () {
            log.info(req.connection.remoteAddress + ' - ' + res.statusCode + ' - ' + req.method + ' - '+ req.url);
        });

        res.on('error', function (err) {
            log.info('Error processing request: ' + err + ' '+ req.connection.remoteAddress + ' - ' + res.statusCode + ' - ' + req.url);
        });

        next();
    };
};

module.exports.validateAPIVersion = function (version) {

    var log = Logule.init(module);

    var header = 'x-broker-api-version';

    return function (req, res, next) {
        if (!req.headers[header]) {
            log.warn(header + ' is missing from the request');
        } else {
            var pattern = new RegExp('^' + version.major + '\\.\\d+$');
            if (!req.headers[header].match(pattern)) {
                log.warn('Incompatible services API version: ' + req.headers[header]);
                res.status(412);
                res.end();
            }
        }
        next();
    };
};
