'use strict';
var crypto = require('crypto');

module.exports.encryptText = function(key, iv, text) {
  var cipherAlg = 'aes256';
  iv = iv.replace(/-/g,'').substring(0,16);
  var cipher = crypto.createCipheriv(cipherAlg, key, iv);

  var encoding = 'base64';
  var result = cipher.update(text, 'utf8', encoding);
  result += cipher.final(encoding);

  return result;
};

module.exports.decryptText = function(key, iv, text) {
  var cipherAlg = 'aes256';
  iv = iv.replace(/-/g,'').substring(0,16);
  var decipher = crypto.createDecipheriv(cipherAlg, key, iv);

  var encoding = 'base64';
  var result = decipher.update(text, encoding);
  result += decipher.final();

  return result;
};
