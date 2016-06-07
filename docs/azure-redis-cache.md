# Azure Redis Cache Service

[Azure Redis Cache](https://azure.microsoft.com/en-us/services/cache/) is based on the popular open-source Redis cache. It gives you access to a secure, dedicated Redis cache, managed by Microsoft and accessible from any application within Azure. This broker currently publishes a single service and plan for provisioning Azure Redis Cache.

## Create an Azure Redis Cache service

1. Get the service name and plans

  ```
  cf marketplace
  ```

  Sample output:

  ```
  service                       plans                     description
  RedisCacheService             basic, standard, premium  Redis Cache Service
  ```

  If you can not find the service name, please use the following command to make the plans public.

  ```
  cf enable-service-access RedisCacheService
  ```

2. Create a service instance

  Configuration parameters are supported with the provision request. These parameters are passed in a valid JSON object containing configuration parameters, provided either in-line or in a file.

  ```
  cf create-service RedisCacheService $service_plan $service_instance_name -c $path_to_parameters
  ```

  Supported configuration parameters:

  ```
  {
    "resourceGroup": "<resource-group-name>",
    "cacheName": "<cache-name>",
    "parameters": {
      "location": "<location>",
      "redisVersion": "<redis-version>",
      "enableNonSslPort": true | false,
      "sku": {
        "name": "<sku-name>",
        "family": "<sku-family>",
        "capacity": <capacity>
      }
    }
  }
  ```

  For example:

  ```
  cf create-service RedisCacheService basic myrediscache -c /tmp/config.json
  ```

  ```
  {
    "resourceGroup": "redisResourceGroup",
    "cacheName": "C0CacheE",
    "parameters": {
      "location": "eastus",
      "redisVersion": "3.0",
      "enableNonSslPort": false,
      "sku": {
        "name": "Basic",
        "family": "C",
        "capacity": 0
      }
    }
  }
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
     "sslPort": 6380
  }
  ```

## Unbinding

  ```
  cf unbind-service $app_name $service_instance_name
  ```

  For example:

  ```
  cf unbind-service demoapp myrediscache
  ```

## Delete the service instance

  ```
  cf delete-service $service_instance_name -f
  ```

  For example:

  ```
  cf delete-service myrediscache -f
  ```
