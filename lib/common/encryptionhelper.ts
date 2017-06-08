'use strict';
var crypto = require('crypto');

export function encryptText(key: string, iv: string, text: string): string {
  var cipherAlg = 'aes256';
  iv = iv.replace(/-/g,'').substring(0,16);
  var cipher = crypto.createCipheriv(cipherAlg, key, iv);

  var encoding = 'base64';
  var result = cipher.update(text, 'utf8', encoding);
  result += cipher.final(encoding);

  return result;
}

export function decryptText(key: string, iv: string, text: string): string {
  var cipherAlg = 'aes256';
  iv = iv.replace(/-/g,'').substring(0,16);
  var decipher = crypto.createDecipheriv(cipherAlg, key, iv);

  var encoding = 'base64';
  var result = decipher.update(text, encoding);
  result += decipher.final();

  return result;
}
