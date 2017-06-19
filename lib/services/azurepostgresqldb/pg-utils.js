'use strict';

const _ = require('underscore');
const Config = require('./service');
const common = require('../../common/');
const log = common.getLogger(Config.name);
const pg = require('pg');

const uppercaseLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const lowercaseLetters = uppercaseLetters.toLowerCase();
const numbers = '1234567890';

const roleLength = 10;
const passwordLength = 16;

module.exports.generateIdentifier = function() {
  return _.sample(lowercaseLetters) +
         _.sample(lowercaseLetters + numbers, roleLength - 1).join('');
};

module.exports.generatePassword = function() {
  return _.sample(
    lowercaseLetters + uppercaseLetters + numbers,
    passwordLength
  ).join('');
};

module.exports.connect = function(config) {
  return new Promise((resolve, reject) => {
    let client = new pg.Client(config);
    client.connect(function (err) {
      if (err) {
        reject(err);
      } else {
        // Workaround: Mainly during testing, encountering many cases of
        // connection reset by peer. We'll log and eat errors from IDLE
        // connections. This should be a harmless thing to do. The broker
        // doesn't interact with any given Postgres database with any real
        // frequency, so we use no connection pooling. i.e. Every connection
        // is intended to standalone and be discarded after a single use
        // anyway. Note that this will not eat errors caused by a query.
        // Those will still be handled by the catch in the promise chain.
        client.on('error', function(err) {
          log.warn(err);
        });
        resolve(client);
      }
    });
  });
};
