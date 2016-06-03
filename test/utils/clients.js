var azurestorageblobClient = require('./azurestorageblobClient');
var azureservicebusClient = require('./azureservicebusClient');
var azurerediscacheClient = require('./azurerediscacheClient');
var azuredocdbClient = require('./azuredocdbClient');

module.exports = {
  'azurestorageblob': new azurestorageblobClient(), 
  'azureservicebus': new azureservicebusClient(),
  'RedisCacheService': new azurerediscacheClient(),
  'documentdb': new azuredocdbClient()
}
