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

var Crypto = require('crypto');

/**
 * Encrypt plain text
 *
 * @param {String} text - the plain text to encrypt
 * @param {String} key - the encryption key
 * @returns {String} hash
 */
exports.encrypt = function (text, key) {
    var cipher = Crypto.createCipher('aes-256-cbc', key);
    var crypted = cipher.update(text,'utf8','hex');
    crypted += cipher.final('hex');
    return crypted;
};

/**
 * Decryption of encrypt()
 *
 * @param {String} text - the encrypted hash
 * @param {String} key - the encryption key
 * @returns {String} plain text
 */
exports.decrypt = function (text, key) {
    var decipher = Crypto.createDecipher('aes-256-cbc', key);
    var dec = decipher.update(text,'hex','utf8');
    dec += decipher.final('utf8');
    return dec;
};
