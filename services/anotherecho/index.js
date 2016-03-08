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

var Config = require('./another-echo-service')

var Handlers = {};

Handlers.catalog = function (req, next) {
    var reply = Config
    return reply;
}

Handlers.provision = function (req, next) {
    if (req.params.service_id == Config.id) {
        var reply = { dashboard_url: "2" };
        next(reply);
    }
}

Handlers.poll = function (req, next) {
    next();
}

Handlers.deprovision = function (req, next) {
    if (req.params.service_id == Config.id) {
        var reply = { };
        next(reply);
    }
}

Handlers.bind = function (req, next) {
    if (req.params.service_id == Config.id) {
       var reply = {};
       reply.credentials = {
           anotherecho: 'another-echo',
       };

       next(reply);
    }
};

Handlers.unbind = function (req, next) {
	    next();
};

module.exports = Handlers;
