# Azure CosmosDB Service

[Azure Cosmos DB](https://azure.microsoft.com/en-us/services/cosmos-db/) is a globally distributed database service designed to enable you to elastically and independently scale throughput and storage across any number of geographical regions with a comprehensive SLA. You can develop document, key/value, or graph databases with Cosmos DB using a series of popular APIs and programming models. Learn how to use Cosmos DB with our quickstarts, tutorials, and samples.

## Behaviors

### Provision
  
  1. Create a CosmosDB account.
  
### Provision-Poll
  
  1. Check whether creating the CosmosDB account succeeds or not. If yes then go to 2, else retry 1.
  
  2. Create a database if the account kind is "Graph", "DocumentDB", or "Table".
  
### Bind

  1. Collect credentials.

### Unbind

  Do nothing.
  
### Deprovision

  1. Delete the CosmosDB account.

### Deprovision-Poll

  1. Check whether deleting the CosmosDB account succeeds or not.
  
## Create an Azure Cosmos DB service

1. Get the service name and plans

  ```
  cf marketplace
  ```

  Sample output:

  ```
  service           plans       description
  azure-cosmosdb    standard*   Azure CosmosDb Service
  ```

  If the "azure-cosmosdb" service is not listed, use the following command to make it public:

  ```
  cf enable-service-access azure-cosmosdb
  ```

2. Create a service instance

  Configuration parameters are supported with the provision request. These parameters are passed in a valid JSON object containing configuration parameters, provided either in-line or in a file.

  ```
  cf create-service azure-cosmosdb $service_plan $service_instance_name -c $path_to_parameters
  ```

  Supported configuration parameters:

  ```
  {
    "resourceGroup": "<resource-group-name>",         // [Required] Unique. Only allow up to 90 characters
    "cosmosDbAccountName": "<CosmosDB-account-name>", // [Required] Unique. Can contain only lowercase letters, numbers, and the '-' character and must be between 3 and 50 characters.
    "cosmosDbName": "<CosmosDB-database-name>",       // [Required if 'kind' is not 'MongoDB'] Unique. Can contain only lowercase letters, numbers, and the '-' character and must be between 3 and 50 characters.
    "location": "<location>",                         // [Required] e.g. eastasia, eastus2, westus, etc. You can use azure cli command 'azure location list' to list all locations.
    "kind": "<kind>"                                  // [Optional] Acceptable values: 'DocumentDB', 'Graph', 'Table', 'MongoDB'. By default, 'DocumentDB'.
  }
  ```

  For example:

  ```
  cf create-service azure-cosmosdb standard mycosmosdb -c examples/cosmosdb-example-config.json
  ```

  The contents of `examples/cosmosdb-example-config.json`:

  ```
  {
    "resourceGroup": "azure-service-broker",
    "cosmosDbAccountName": "generated-string",
    "cosmosDbName": "generated-string",
    "location": "eastus",
    "kind": "DocumentDB"
  }
  ```
  
  >**NOTE:** Please remove the comments in the JSON file before you use it.
  
  Above parameters are also the defaults if the broker operator doesn't change broker default settings. You can just run the following command to create a service instance without the json file:
  
  ```
  cf create-service azure-cosmosdb standard mycosmosdb
  ```

3. Check the operation status of creating the service instance

  The creating operation is asynchronous. You can get the operation status after the creating operation.

  ```
  cf service $service_instance_name
  ```

  For example:

  ```
  cf service mycosmosdb
  ```

[More information](http://docs.cloudfoundry.org/devguide/services/managing-services.html#create).

## Using the services in your application

### Binding

  ```
  cf bind-service $app_name $service_instance_name
  ```

  For example:

  ```
  cf bind-service demoapp mycosmosdb
  ```

### Format of Credentials

  Verify that the credentials are set as environment variables

  ```
  cf env $app_name
  ```

  The credentials of **DocumentDB account**(include Graph and Table) have the following format:
  
  ```
  "credentials": {
    "cosmosdb_host_endpoint": "https://YOUR_COSMOSDB_ACCOUNT_NAME.documents.azure.com:443/",
    "cosmosdb_master_key": "YOUR_SECRET_KEY_ENDING_IN_==",
    "cosmosdb_readonly_master_key": "YOUR_READONLY_SECRET_KEY_ENDING_IN_==",
    "cosmosdb_database_id": "YOUR_COSMOSDB_NAME",
    "cosmosdb_database_link": "dbs/ID_ENDING_IN_==/"
  }
  ```
  
  The credentials of **MongoDB account** have the following format:

  ```
  "credentials": {
    "cosmosdb_host_endpoint": "https://YOUR_COSMOSDB_ACCOUNT_NAME.documents.azure.com:10255/",
    "cosmosdb_username": "YOUR_COSMOSDB_ACCOUNT_NAME",
    "cosmosdb_password": "YOUR_PASSWORD_ENDING_IN_==",
    "cosmosdb_database_name": "YOUR_COSMOSDB_NAME",
    "cosmosdb_connection_string": "mongodb://<cosmosdb_username>:<cosmosdb_password>@<cosmosdb_host_endpoint>?ssl=true&replicaSet=globaldb"
  }
  ```
  
## Unbinding

  ```
  cf unbind-service $app_name $service_instance_name
  ```

  For example:

  ```
  cf unbind-service demoapp mycosmosdb
  ```

## Delete the service instance

  ```
  cf delete-service $service_instance_name -f
  ```

  For example:

  ```
  cf delete-service mycosmosdb -f
  ```
