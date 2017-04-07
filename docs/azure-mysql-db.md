# Azure MySQL Database Service

//TODO add description

## Behaviors

### Provision
  
  1. Create a server.
  
### Provision-Poll
  
  1. Check whether creating server succeeds or not.
  
  2. Configure firewall rules
  
### Bind
  
  1. Collect [credentials](./azure-mysql-db.md#format-of-credentials).
  
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
  azure-mysqldb   basic   Azure MySQL Database Service
  ```

  If you can not find the service name, please use the following command to make the plans public.

  ```
  cf enable-service-access azure-mysqldb
  ```

2. Create a service instance

  Configuration parameters are supported with the provision request. These parameters are passed in a valid JSON object containing configuration parameters, provided either in-line or in a file.

  ```
  cf create-service azure-mysqldb $service_plan $service_instance_name -c $path_to_parameters
  ```

  Supported configuration parameters:

  ```
  {
    "resourceGroup": "<resource-group>",        // [Required] Unique. Only allow up to 90 characters
    "location": "<azure-region-name>",          // [Required] support westus and northeurope only
    "mysqlServerName": "<mysql-server-name>",     // [Required] Unique. sqlServerName cannot be empty or null. It can contain only lowercase letters, numbers and '-', but can't start or end with '-' or have more than 63 characters. 
    "mysqlServerParameters": {
        "allowMysqlServerFirewallRules": [        // [Optional] If present, ruleName, startIpAddress and endIpAddress are mandatory in every rule.
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
            "version": "5.6 | 5.7",
            "storageMB": 51200,
            "administratorLogin": "<mysql-server-admin-name>",
            "administratorLoginPassword": "<mysql-server-admin-password>"
        }
    }
  }
  ```

  For example:

  ```
  cf create-service azure-mysqldb basic mysqldb -c examples/mysqldb-example-config.json
  ```

  The contents of `examples/mysqldb-example-config.json`:

  ```
  {
      "resourceGroup": "mysqldbResourceGroup",
      "location": "westus",
      "mysqlServerName": "mysqlservera",
      "mysqlServerParameters": {
          "allowMysqlServerFirewallRules": [
              {
                "ruleName": "new rule",
                "startIpAddress": "0.0.0.0",
                "endIpAddress": "255.255.255.255"
              }
          ],
          "properties": {
              "version": "5.6",
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
  cf service mysqldb
  ```

[More information](http://docs.cloudfoundry.org/devguide/services/managing-services.html#create).

## Using the services in your application

### Binding

  ```
  cf bind-service $app_name $service_instance_name
  ```

  For example:

  ```
  cf bind-service demoapp mysqldb
  ```

### Format of Credentials

  Verify that the credentials are set as environment variables

  ```
  cf env $app_name
  ```

  The credentials have the following format:

  ```
  "credentials": {
    "mysqlServerName": "fake-server",
    "mysqlServerFullyQualifiedDomainName": "fake-server.database.windows.net",
    "administratorLogin": "ulrich",
    "administratorLoginPassword": "u1r8chP@ss",
    "jdbcUrl": "jdbc:mysql://fake-server.database.windows.net:3306;database={your_database}?verifyServerCertificate=true&useSSL=true&requireSSL=true",
  }

  ```
  
## Unbinding

  ```
  cf unbind-service $app_name $service_instance_name
  ```

  For example:

  ```
  cf unbind-service demoapp mysqldb
  ```

## Delete the service instance

  ```
  cf delete-service $service_instance_name -f
  ```

  For example:

  ```
  cf delete-service mysqldb -f
  ```
