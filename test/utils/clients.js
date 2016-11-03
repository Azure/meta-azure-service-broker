var azurestorageClient = require('./azurestorageClient');
var azureservicebusClient = require('./azureservicebusClient');
var azurerediscacheClient = require('./azurerediscacheClient');
var azuredocdbClient = require('./azuredocdbClient');
var azuresqldbClient = require('./azuresqldbClient');

var environment = process.env['ENVIRONMENT'];

module.exports = {
  'azure-storage': new azurestorageClient(environment), 
  'azure-servicebus': new azureservicebusClient(environment),
  'azure-rediscache': new azurerediscacheClient(),
  'azure-documentdb': new azuredocdbClient(),
  'azure-sqldb': new azuresqldbClient(environment)
}
