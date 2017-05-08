var AzurestorageClient = require('./azurestorageClient');
var AzureservicebusClient = require('./azureservicebusClient');
var AzurerediscacheClient = require('./azurerediscacheClient');
var AzuredocdbClient = require('./azuredocdbClient');
var AzuresqldbClient = require('./azuresqldbClient');
var AzuremysqldbClient = require('./azuremysqldbClient');
var AzurepostgresqldbClient = require('./azurepostgresqldbClient');

var environment = process.env['ENVIRONMENT'];

module.exports = {
  'azure-storage': new AzurestorageClient(environment), 
  'azure-servicebus': new AzureservicebusClient(environment),
  'azure-rediscache': new AzurerediscacheClient(),
  'azure-documentdb': new AzuredocdbClient(),
  'azure-sqldb': new AzuresqldbClient(environment),
  'azure-mysqldb': new AzuremysqldbClient(environment),
  'azure-postgresqldb': new AzurepostgresqldbClient(environment)
};
