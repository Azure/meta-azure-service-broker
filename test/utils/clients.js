var azurestorageClient = require('./azurestorageClient');
var azureservicebusClient = require('./azureservicebusClient');
var azurerediscacheClient = require('./azurerediscacheClient');
var azuredocdbClient = require('./azuredocdbClient');
var azuresqldbClient = require('./azuresqldbClient');

module.exports = {
  'azure-storage': new azurestorageClient(), 
  'azure-servicebus': new azureservicebusClient(),
  'azure-rediscache': new azurerediscacheClient(),
  'azure-documentdb': new azuredocdbClient(),
  'azure-sqldb': new azuresqldbClient()
}
