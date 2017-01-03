# Azure Service Bus Service

[Azure Service Bus](https://azure.microsoft.com/en-us/services/service-bus/) keep apps and devices connected across private and public clouds. This broker currently publishes a single service and plan for provisioning Azure Service Bus Service.

## Behaviors

### Provision
  
  1. Create a Namespace.
  
### Provision-Poll
  
  1. Check whether creating the Namespace succeeds or not.
  
### Bind

  1. Collect credentials.

### Unbind

  Do nothing.
  
### Deprovision

  1. Delete the Namespace.

### Deprovision-Poll

  1. Check whether deleting the Namespace succeeds or not.
  
## Create an Azure service bus service

1. Get the service name and plans

  ```
  cf marketplace
  ```

  Sample output:

  ```
  service                       plans                     description
  azure-servicebus              standard                  Azure Service Bus Service
  ```

  If you can not find the service name, please use the following command to make the plans public.

  ```
  cf enable-service-access azure-servicebus
  ```

2. Create a service instance

  Configuration parameters are passed in a valid JSON object containing configuration parameters, provided either in-line or in a file. If these parameters are not provided, the broker will create the resources according to [Naming Conventions](#naming-conventions).

  ```
  cf create-service azure-servicebus $service_plan $service_instance_name -c $path_to_parameters
  ```

  Supported configuration parameters:
  ```
  {
    "resource_group_name": "<resource-group-name>", // [Required] Only allow up to 90 characters
    "namespace_name": "<namespace-name>", // [Required] Between 6 and 50 characters long
    "location": "<location>",             // [Required] e.g. eastasia, eastus2, westus, etc. You can use azure cli command 'azure location list' to list all locations.
    "type": "<type>",                     // [Required] Possible values are `Messaging`, `EventHub` and `NotificationHub`
    "messaging_tier": "<messaging-tier>"  // [Required] Possible values are `Basic`, `Standard` and `Premium` for type `Messaging`, `Basic` and `Standard` for type `EventHub`, `Standard` for type `NotificationHub`.
  }
  ```

  * **type**: Possible values are `Messaging`, `EventHub` and `NotificationHub`.
  * **messaging-tier**: Possible values are `Basic`, `Standard` and `Premium` for type `Messaging`, `Basic` and `Standard` for type `EventHub`, `Standard` for type `NotificationHub`.

  For example:

  ```
  cf create-service azure-servicebus standard myservicebus -c examples/servicebus-example-config.json
  ```

  The contents of `examples/servicebus-example-config.json`:

  ```
  {
    "resource_group_name": "myResourceGroup",
    "namespace_name": "myservicebus",
    "location": "eastus",
    "type": "Messaging",
    "messaging_tier": "Standard"
  }
  ```

  >**NOTE:** Please remove the comments in the JSON file before you use it.

3. Check the operation status of creating the service instance

  The creating operation is asynchronous. You can get the operation status after the creating operation.

  ```
  cf service $service_instance_name
  ```

  For example:

  ```
  cf service myservicebus
  ```

[More information](http://docs.cloudfoundry.org/devguide/services/managing-services.html#create).

## Using the services in your application

### Binding

  ```
  cf bind-service $app_name $service_instance_name
  ```

  For example:

  ```
  cf bind-service demoapp myservicebus
  ```

### Format of Credentials

  Verify that the credentials are set as environment variables

  ```
  cf env $app_name
  ```

  The credentials have the following format:
  
  ```
  "credentials": {
    "namespace_name": "cf-2eac2d52-bfc9-4d0f-af28-c02187689d72",
    "key_name": "KEY-NAME",
    "key_value": "KEY-VALUE",
  }
  ```

## Unbinding

  ```
  cf unbind-service $app_name $service_instance_name
  ```

  For example:

  ```
  cf unbind-service demoapp myservicebus
  ```

## Delete the service instance

  ```
  cf delete-service $service_instance_name -f
  ```

  For example:

  ```
  cf delete-service myservicebus -f
  ```
