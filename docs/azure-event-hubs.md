# Azure Event Hubs Service

[Azure Event Hubs](https://azure.microsoft.com/en-us/services/event-hubs/) is a hyper-scale telemetry ingestion service that collects, transforms, and stores millions of events. As a distributed streaming platform, it gives you low latency and configurable time retention, which enables you to ingress massive amounts of telemetry into the cloud and read the data from multiple applications using publish-subscribe semantics.

## Behaviors

### Provision
  
  1. Create a Namespace.
  
### Provision-Poll
  
  1. Check whether creating the Namespace succeeds or not. If yes, go to 2.
  
  2. Create an event hub.
  
### Bind

  1. Collect credentials.

### Unbind

  Do nothing.
  
### Deprovision

  1. Delete the Namespace.

### Deprovision-Poll

  1. Check whether deleting the Namespace succeeds or not.
  
## Create an Azure event hubs service

1. Get the service name and plans

  ```
  cf marketplace
  ```

  Sample output:

  ```
  service                       plans                        description
  azure-eventhubs               basic*, standard*            Azure Event Hubs Service
  ```

  If you can not find the service name, please use the following command to make the plans public.

  ```
  cf enable-service-access azure-eventhubs
  ```

2. Create a service instance

  Configuration parameters are passed in a valid JSON object containing configuration parameters, provided either in-line or in a file. If these parameters are not provided, the broker will create the resources according to [Naming Conventions](#naming-conventions).

  ```
  cf create-service azure-eventhubs $service_plan $service_instance_name -c $path_to_parameters
  ```

  Supported configuration parameters:
  ```
  {
    "resourceGroup": "<resource-group-name>", // [Required] Only allow up to 90 characters
    "location": "<location>"                  // [Required] e.g. eastasia, eastus2, westus, etc. You can use azure cli command 'azure location list'(cli v2: 'az account list-locations') to list all locations.
    "namespaceName": "<namespace-name>",      // [Required] Between 6 and 50 characters long
    "eventHubName": "generated-string",       // [Required] Between 6 and 50 characters long
    "eventHubProperties": {                   // [Optional]
      "messageRetentionInDays": <a-number>,   // 1-7
      "partitionCount": <a-number>            // 2-32
    }
  }
  ```

  For example:

  ```
  cf create-service azure-eventhubs standard myeventhubs -c examples/eventhubs-example-config.json
  ```

  The contents of `examples/eventhubs-example-config.json`:

  ```
  {
    "resourceGroup": "azure-service-broker",
    "location": "eastus",
    "namespaceName": "generated-string",
    "eventHubName": "generated-string",
    "eventHubProperties": {
      "messageRetentionInDays": 1,
      "partitionCount": 2
    }
  }
  ```

  >**NOTE:** Please remove the comments in the JSON file before you use it.
  
  Above parameters are also the defaults if the broker operator doesn't change broker default settings. You can just run the following command to create a service instance without the json file:
  
  ```
  cf create-service azure-eventhubs standard myeventhubs
  ```

3. Check the operation status of creating the service instance

  The creating operation is asynchronous. You can get the operation status after the creating operation.

  ```
  cf service $service_instance_name
  ```

  For example:

  ```
  cf service myeventhubs
  ```

[More information](http://docs.cloudfoundry.org/devguide/services/managing-services.html#create).

## Using the services in your application

### Binding

  ```
  cf bind-service $app_name $service_instance_name
  ```

  For example:

  ```
  cf bind-service demoapp myeventhubs
  ```
  
  * `cf restage` might be necessary for the app to read the bound credentials

### Format of Credentials

  Verify that the credentials are set as environment variables

  ```
  cf env $app_name
  ```

  The credentials have the following format:
  
  ```
  "credentials": {
    "namespace_name": "cf-2eac2d52-bfc9-4d0f-af28-c02187689d72",
    "event_hub_name": "testeh",
    "key_name": "KEY-NAME",
    "key_value": "KEY-VALUE",
    "namespace_connection_string": "Endpoint=sb://<namespace_endpoint>/;SharedAccessKeyName=<shared_access_key_name>;SharedAccessKey=<shared_access_key_value>",
    "event_hub_connection_string": "Endpoint=sb://<namespace_endpoint>/;SharedAccessKeyName=<shared_access_key_name>;SharedAccessKey=<shared_access_key_value>;EntityPath=<event_hub_name>",
  }
  ```

## Unbinding

  ```
  cf unbind-service $app_name $service_instance_name
  ```

  For example:

  ```
  cf unbind-service demoapp myeventhubs
  ```

## Delete the service instance

  ```
  cf delete-service $service_instance_name -f
  ```

  For example:

  ```
  cf delete-service myeventhubs -f
  ```
