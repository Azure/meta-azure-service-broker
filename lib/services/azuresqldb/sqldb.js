/* jshint camelcase: false */
/* jshint newcap: false */


exports.SqlDbManagementClient = function(azure, baseUri) {
  if (azure === null || azure === undefined) {
    throw new Error('\'azure\' cannot be null.');
  }
  
  this.baseUri = baseUri;
  if (!this.baseUri) {
    this.baseUri = 'https://management.azure.com';
  }
  this.azure = azure;
  
  this.sqldb = new SqlDb(this);
};

exports.SqlDb = function(client) {
  this.client = client;
}

SqlDb.prototype.createOrUpdate = function (resourceGroupName, name, parameters, options, callback) {
  var client = this.client;
  if (!callback) {
    throw new Error('callback cannot be null.');
  }
};

SqlDb.prototype.deleteMethod = function (resourceGroupName, name, options, callback) {
  var client = this.client;
  if (!callback) {
    throw new Error('callback cannot be null.');
  }
};

SqlDb.prototype.get = function (resourceGroupName, name, options, callback) {
  var client = this.client;
  if (!callback) {
    throw new Error('callback cannot be null.');
  }
};

