# Azure Redis Cache Service

[Azure Redis Cache](https://azure.microsoft.com/en-us/services/cache/) is based on the popular open-source Redis cache. It gives you access to a secure, dedicated Redis cache, managed by Microsoft and accessible from any application within Azure. This broker currently publishes a single service and plan for provisioning Azure Redis Cache.

## Behaviors

### Provision

  1. Create a Redis Cache.

### Provision-Poll

  1. Check whether creating the Redis Cache succeeds or not.

### Bind

  1. Collect credentials.

### Unbind

  Do nothing.

### Deprovision

  1. Delete the Redis Cache.

### Deprovision-Poll

  1. Check whether deleting the Redis Cache succeeds or not.

### Updated

  1. Update pricing tier and enableNonSslPort setting according to your updating parameters.

## Create an Azure Redis Cache service

1. Get the service name and plans

  ```
  cf marketplace
  ```

  Sample output:

  ```
  service                       plans                        description
  azure-rediscache              basic*, standard*, premium*  Azure Redis Cache Service
  ```

  If you can not find the service name, please use the following command to make the plans public.

  ```
  cf enable-service-access azure-rediscache
  ```

2. Create a service instance

  Configuration parameters are supported with the provision request. These parameters are passed in a valid JSON object containing configuration parameters, provided either in-line or in a file.

  ```
  cf create-service azure-rediscache $service_plan $service_instance_name -c $path_to_parameters
  ```

  Supported configuration parameters:

  ```
  {
    "resourceGroup": "<resource-group-name>", // [Required] Unique. Only allow up to 90 characters
    "location": "<location>",                 // [Required] e.g. eastasia, eastus2, westus, etc. You can use azure cli command 'azure location list' to list all locations.
    "cacheName": "<cache-name>",              // [Required] Unique. Must be between 3 and 63 characters long. Can only contain numbers, letters, and the - character. The cache name cannot start or end with the - character, and consecutive - characters are not valid.
    "parameters": {
      "enableNonSslPort": true | false
    }
  }
  ```

  For example:

  ```
  cf create-service azure-rediscache basic myrediscache -c examples/rediscache-example-config.json
  ```

  The contents of `examples/rediscache-example-config.json`:

  ```
  {
    "resourceGroup": "azure-service-broker",
    "location": "eastus",
    "cacheName": "generated-string",
    "parameters": {
      "enableNonSslPort": false
    }
  }
  ```

  **NOTE:**

   * Please remove the comments in the JSON file before you use it.

   * The `enableNonSslPort` setting has a effect on the `redisUrl` in the [credentials](#format-of-credentials) delivered by binding. If `true`, `redisUrl` would be in `redis` scheme with port `6379`. Else, `redisUrl` would be in `rediss` scheme with port `6380`. With `rediss`, please check if your client supports SSL connection. For Spring Cloud Connector users, you need to upgrade the Connector version to [2.0.3-RELEASE](https://github.com/spring-cloud/spring-cloud-connectors/releases/tag/v2.0.3.RELEASE) or higher.

  Above parameters are also the defaults if the broker operator doesn't change broker default settings. You can just run the following command to create a service instance without the json file:

  ```
  cf create-service azure-rediscache basic myrediscache
  ```

  To create redis instances for Spring apps, you need to run:

  ```
  cf create-service azure-rediscache basic myrediscache -c '{"parameters":{"enableNonSslPort":true}}'
  ```

3. Check the operation status of creating the service instance

  The creating operation is asynchronous. You can get the operation status after the creating operation.

  ```
  cf service $service_instance_name
  ```

  For example:

  ```
  cf service myrediscache
  ```

[More information](http://docs.cloudfoundry.org/devguide/services/managing-services.html#create).

## Using the services in your application

### Binding

  ```
  cf bind-service $app_name $service_instance_name
  ```

  For example:

  ```
  cf bind-service demoapp myrediscache
  ```

### Format of Credentials

  Verify that the credentials are set as environment variables

  ```
  cf env $app_name
  ```

  The credentials have the following format:

  ```
  "credentials": {
     "hostname": "<cache-name>.redis.cache.windows.net",
     "name": "<cache-name>",
     "port": 6379,
     "primaryKey": "<primary-key>",
     "secondaryKey": "<secondary-key>",
     "sslPort": 6380,
     "redisUrl": "redis://<cache-name>:<primary-key>@<cache-name>.redis.cache.windows.net:6379"
  }
  ```

  **NOTE:**

   * The `redisUrl` would be `rediss://*****:6380` if non-SSL port is not enabled.

## Unbinding

  ```
  cf unbind-service $app_name $service_instance_name
  ```

  For example:

  ```
  cf unbind-service demoapp myrediscache
  ```

## Updating

  ```
  cf update-service $service_instance_name -p $plan_name -c $updating_parameters
  ```
  For example:

  ```
  cf update-service myrediscache -p standardc0 -c '{"parameters":{"enableNonSslPort":true}}'
  ```

  * Updating the service plan.
    Note that, you can't change tier family and capacity at the same time in one single request per the limitation of Azure Redis service. For example, you can update from `basicc0` to `standardc0`. But you can't update from `basicc0` to `standardc1`. You need to update from `basicc0` to `standardc0`, then from `standardc0` to `standardc1`.
  * Updating the service properties.
    Currently, only the `enableNonSslPort` setting is supported to update.

## Delete the service instance

  ```
  cf delete-service $service_instance_name -f
  ```

  For example:

  ```
  cf delete-service myrediscache -f
  ```
