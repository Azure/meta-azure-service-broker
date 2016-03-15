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

var Config = require('./echo-service')

var Handlers = {};

Handlers.catalog = function(broker, next) {
  var reply = Config;
  next(null, reply);
}

Handlers.provision = function(broker, req, next) {
  var reply = {
    dashboard_url: "1"
  };
  broker.log.info('%j', reply)
  next(reply);
}

Handlers.poll = function(broker, req, next) {
  var reply = {
    state: "succeeded",
    description: "succeeded",
  };
  next(reply);
}

Handlers.deprovision = function(broker, req, next) {
  var reply = {};
  next(reply);
}

Handlers.bind = function(broker, req, next) {
  var reply = {};
  reply.credentials = {
    echo: 'echo',
  };
  next(reply);
};

Handlers.unbind = function(broker, req, next) {
  next();
};

module.exports = Handlers;