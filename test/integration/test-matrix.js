var submatrix;

switch(process.env['ENVIRONMENT']) {
    case 'AzureCloud':
        submatrix = [
          'storage',
          'servicebus',
          'eventhubs',
          'docdb',
          'cosmosdb',
          'sqldb',
          'rediscache',
          'mysqldb',
          'postgresqldb'
        ];
        break;
    case 'AzureChinaCloud':
        submatrix = [
          'storage',
          'servicebus',
          'eventhubs',
          'docdb',
          'sqldb',
          'rediscache'
        ];
        break;
    case 'AzureUSGovernment':
        submatrix = [
          'storage',
          'servicebus',
          'eventhubs',
          'docdb',
          'sqldb',
          'rediscache'
        ];
        break;
    case 'AzureGermanCloud':
        submatrix = [
          'storage',
          'servicebus',
          'eventhubs',
          'docdb',
          'cosmosdb',
          'sqldb',
          'rediscache'
        ];
        break;
    default:
        submatrix = [];
}

var testMatrix = [];

submatrix.forEach(function(name) {
    testMatrix = testMatrix.concat(require('./submatrix/' + name));
});

module.exports = testMatrix;
