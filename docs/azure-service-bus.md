# Azure Service Bus Service

[Azure Service Bus](https://azure.microsoft.com/en-us/services/service-bus/) keep apps and devices connected across private and public clouds. This broker currently publishes a single service and plan for provisioning Azure Service Bus Service.

## Create an Azure service bus service

1. Get the service name and plans

  ```
  cf marketplace
  ```

2. Create a service instance

  ```
  cf create-service azureservicebus default <service-instance-name>
  ```

  For example:

  ```
  cf create-service azureservicebus default myservicebus
  ```

  Additional configuration parameters are supported with the provision request. These parameters are passed in a valid JSON object containing configuration parameters, provided either in-line or in a file. If these parameters are not provided, the broker will create the resources according to [Naming Conventions](#naming-conventions).

  ```
  cf create-service azureservicebus default <service-instance-name> -c /tmp/config.json
  ```

  Supported configuration parameters:
  ```
  {
    "resource_group_name": "$resource-group-name",
    "namespace_name": "$namespace-name",
    "location": "$location",
    "type": "$type",
    "messaging_tier": "$messaging_tier"
  }
  ```

  For example:

  ```
  {
    "resource_group_name": "myResourceGroup",
    "namespace_name": "myservicebus",
    "location": "eastus",
    "type": "Messaging | EventHub | NotificationHub",
    "messaging_tier": "Standard"
  }
  ```

3. Check the operation status of creating the service instance

  The creating operation is asynchronous. You can get the operation status after the creating operation.

  ```
  cf service myservicebus
  ```

[More information](http://docs.cloudfoundry.org/devguide/services/managing-services.html#create).

## Using the services in your application

### Format of Credentials

The credentials provided in a bind call have the following format:

```
"credentials":{
  "namespace_name": "cf-2eac2d52-bfc9-4d0f-af28-c02187689d72",
  "key_name": "KEY-NAME",
  "key_value": "KEY-VALUE",
}
```
