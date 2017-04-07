var submatrix = ['storage', 'servicebus', 'docdb', 'sqldb', 'rediscache', 'mysqldb'];

var testMatrix = [];

submatrix.forEach(function(name) {
    testMatrix = testMatrix.concat(require('./submatrix/' + name));
});

module.exports = testMatrix;
