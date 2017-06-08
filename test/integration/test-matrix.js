var submatrix = ['storage', 'servicebus', 'docdb', 'cosmosdb', 'sqldb', 'rediscache', 'mysqldb', 'postgresqldb'];

var testMatrix = [];

submatrix.forEach(function(name) {
    testMatrix = testMatrix.concat(require('./submatrix/' + name));
});

module.exports = testMatrix;
