'use strict';
var crypto = require('crypto');

function EncryptionHelper(key, iv, cipherAlg, encoding) {
  this.key = key;
  this.iv = iv;
  this.cipherAlg = cipherAlg || 'aes256';
  this.encoding = encoding || 'base64';
}

EncryptionHelper.prototype.encryptText = function(text) {
  var cipher = crypto.createCipheriv(this.cipherAlg, this.key, this.iv);

  var result = cipher.update(text, 'utf8', this.encoding);
  result += cipher.final(this.encoding);

  return result;
};

EncryptionHelper.prototype.decryptText = function(text) {
  var decipher = crypto.createDecipheriv(this.cipherAlg, this.key, this.iv);

  var result = decipher.update(text, this.encoding);
  result += decipher.final();

  return result;
};

module.exports = EncryptionHelper;
