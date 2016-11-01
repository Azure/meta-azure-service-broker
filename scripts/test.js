#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

var args = (process.ARGV || process.argv);

var reporter = 'list';
var xunitOption = Array.prototype.indexOf.call(args, '-xunit');
if (xunitOption !== -1) {
  reporter = 'xunit';
  args.splice(xunitOption, 1);
}

var testList = args.pop();

var fileContent;
var root = false;

if  (!fs.existsSync) {
  fs.existsSync = require('path').existsSync;
}

if (fs.existsSync(testList)) {
  fileContent = fs.readFileSync(testList).toString();
} else {
  fileContent = fs.readFileSync('./test/' + testList).toString();
  root = true;
}

var files = fileContent.split('\n');

args.push('-u');
args.push('tdd');

// TODO: remove this timeout once tests are faster
args.push('-t');
args.push('200000');

files.forEach(function (file) {
  if (file.length > 0 && file.trim()[0] !== '#') {
    // trim trailing \r if it exists
    file = file.replace('\r', '');

    if (root) {
      args.push('test/' + file);
    } else {
      args.push(file);
    }
  }
});

args.push('-R');
args.push(reporter);

require('../node_modules/mocha/bin/mocha');
