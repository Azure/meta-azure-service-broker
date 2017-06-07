var supportedEnvironment = {
  AzureCloud: {
    location: 'eastus',
    redisCacheEndpointSuffix: '.redis.cache.windows.net',
    sqlServerEndpointSuffix: '.database.windows.net',
    mysqlServerEndpointSuffix: '.mysql.database.azure.com',
    postgresqlServerEndpointSuffix: '.postgres.database.azure.com',
    serviceBusEndpointSuffix: '.servicebus.windows.net',
    storageEndpointSuffix: '.core.windows.net'
  },
  AzureChinaCloud: {
    location: 'chinaeast',
    redisCacheEndpointSuffix: '.redis.cache.chinacloudapi.cn',
    sqlServerEndpointSuffix: '.database.chinacloudapi.cn',
    serviceBusEndpointSuffix: '.servicebus.chinacloudapi.cn',
    storageEndpointSuffix: '.core.chinacloudapi.cn'
  }
};

module.exports = supportedEnvironment;