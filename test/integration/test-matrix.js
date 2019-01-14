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
          'sqldbfg',
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
          'sqldbfg',
          'rediscache',
          'postgresqldb'
        ];
        break;
    case 'AzureUSGovernment':
        submatrix = [
          'storage',
          'servicebus',
          'eventhubs',
          'docdb',
          'sqldb',
          'sqldbfg',
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
          'sqldbfg',
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
