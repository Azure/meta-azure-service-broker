# Azure PostgreSQL Database Service

//TODO add description

## Behaviors

### Provision
  
  1. Create a server.
  
### Provision-Poll
  
  1. Check whether creating server succeeds or not.
  
  2. Configure firewall rules
  
### Bind
  
  1. Collect [credentials](./azure-postgresql-db.md#format-of-credentials).
  
### Unbind

  Do nothing
  
### Deprovision

  1. Delete the server.

### Deprovision-Poll

  1. Check whether deleting server succeeds or not.

## Create an Azure MySQL Database service

1. Get the service name and plans

  ```
  cf marketplace
  ```

  Sample output:

  ```
  service         plans                                                                                                                                                            description
  azure-postgresqldb   basic   Azure PostgreSQL Database Service
  ```

  If you can not find the service name, please use the following command to make the plans public.

  ```
  cf enable-service-access azure-postgresqldb
  ```

2. Create a service instance

  Configuration parameters are supported with the provision request. These parameters are passed in a valid JSON object containing configuration parameters, provided either in-line or in a file.

  ```
  cf create-service azure-postgresqldb $service_plan $service_instance_name -c $path_to_parameters
  ```

  Supported configuration parameters:

  ```
  {
    "resourceGroup": "<resource-group>",        // [Required] Unique. Only allow up to 90 characters
    "location": "<azure-region-name>",          // [Required] support westus and northeurope only
    "postgresqlServerName": "<postgresql-server-name>",// [Required] Unique. sqlServerName cannot be empty or null. It can contain only lowercase letters, numbers and '-', but can't start or end with '-' or have more than 63 characters. 
    "postgresqlServerParameters": {
        "allowPostgresqlServerFirewallRules": [        // [Optional] If present, ruleName, startIpAddress and endIpAddress are mandatory in every rule.
            {
                "ruleName": "<rule-name-0>",
                "startIpAddress": "xx.xx.xx.xx",
                "endIpAddress": "xx.xx.xx.xx"
            },
            {
                "ruleName": "<rule-name-1>",
                "startIpAddress": "xx.xx.xx.xx",
                "endIpAddress": "xx.xx.xx.xx"
            }
        ],
        "properties": {
            "version": "9.5 | 9.6",
            "storageMB": 51200,
            "administratorLogin": "<postgresql-server-admin-name>",
            "administratorLoginPassword": "<postgresql-server-admin-password>"
        }
    }
  }
  ```

  For example:

  ```
  cf create-service azure-postgresqldb basic postgresqldb -c examples/postgresqldb-example-config.json
  ```

  The contents of `examples/postgresqldb-example-config.json`:

  ```
  {
      "resourceGroup": "postgresqldbResourceGroup",
      "location": "westus",
      "postgresqlServerName": "postgresqlservera",
      "postgresqlServerParameters": {
          "allowMysqlServerFirewallRules": [
              {
                "ruleName": "new rule",
                "startIpAddress": "0.0.0.0",
                "endIpAddress": "255.255.255.255"
              }
          ],
          "properties": {
              "version": "9.6",
              "storageMB": 51200,
              "administratorLogin": "myusername",
              "administratorLoginPassword": "mypassword"
          }
      }
  }
  ```

**NOTE:**

  * Please remove the comments in the JSON file before you use it.

3. Check the operation status of creating the service instance

  The creating operation is asynchronous. You can get the operation status after the creating operation.

  ```
  cf service $service_instance_name
  ```

  For example:

  ```
  cf service postgresqldb
  ```

[More information](http://docs.cloudfoundry.org/devguide/services/managing-services.html#create).

## Using the services in your application

### Binding

  ```
  cf bind-service $app_name $service_instance_name
  ```

  For example:

  ```
  cf bind-service demoapp postgresqldb
  ```

### Format of Credentials

  Verify that the credentials are set as environment variables

  ```
  cf env $app_name
  ```

  The credentials have the following format:

  ```
  "credentials": {
    "postgresqlServerName": "fake-server",
    "postgresqlServerFullyQualifiedDomainName": "fake-server.database.windows.net",
    "administratorLogin": "ulrich",
    "administratorLoginPassword": "u1r8chP@ss",
    "jdbcUrl": "jdbc:postgresql://fake-server.database.windows.net:5432;database={your_database}?user=ulrich@fake-server&password=u1r8chP@ss&ssl=true",
  }

  ```
  
## Unbinding

  ```
  cf unbind-service $app_name $service_instance_name
  ```

  For example:

  ```
  cf unbind-service demoapp postgresqldb
  ```

## Delete the service instance

  ```
  cf delete-service $service_instance_name -f
  ```

  For example:

  ```
  cf delete-service postgresqldb -f
  ```
