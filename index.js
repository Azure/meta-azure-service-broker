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

var Broker = require('./broker');
var Config = require('./config/meta-service-broker');
var echo = require('./services/echo')
var anotherecho = require('./services/anotherecho')

var broker = new Broker(Config);

broker.start();

broker.on('catalog', function (req, next) {
    var reply = {};
    reply.services = []
    var echo_service = echo.catalog(req, next)
    reply.services.push(echo_service)
    var anotherecho_service = anotherecho.catalog(req, next)
    reply.services.push(anotherecho_service)
    next(reply);
});

// Listeners for echo service
broker.on('provision', echo.provision);
broker.on('poll', echo.poll);
broker.on('deprovision', echo.deprovision);
broker.on('bind', echo.bind);
broker.on('unbind', echo.unbind);

// Listeners for echo service
broker.on('provision', anotherecho.provision);
broker.on('poll', anotherecho.poll);
broker.on('deprovision', anotherecho.deprovision);
broker.on('bind', anotherecho.bind);
broker.on('unbind', anotherecho.unbind);
