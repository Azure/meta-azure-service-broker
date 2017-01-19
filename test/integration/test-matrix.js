var _ = require('underscore');

var submatrix = ['storage', 'servicebus', 'docdb', 'sqldb', 'rediscache'];

var testMatrix = [];

submatrix.forEach(function(name) {
    testMatrix = testMatrix.concat(require('./submatrix/' + name));
});

module.exports = testMatrix;


