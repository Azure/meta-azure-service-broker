# Azure SQL Database Service

[Azure SQL Database](https://azure.microsoft.com/en-us/documentation/articles/sql-database-technical-overview/) is a relational database service in the cloud based on the market-leading Microsoft SQL Server engine, with mission-critical capabilities.

## Create an Azure SQL Database service

1. Get the service name and plans

  ```
  cf marketplace
  ```

  Sample output:

  ```
  service      plans                                                                                                                      description
  azure-sqldb  basic*, StandardS0*, StandardS1*, StandardS2*, StandardS3*, PremiumP1*, PremiumP2*, PremiumP4*, PremiumP6*, PremiumP11*    Azure SQL Database Service
  ```

  If you can not find the service name, please use the following command to make the plans public.

  ```
  cf enable-service-access azure-sqldb
  ```

2. Create a service instance

  Configuration parameters are supported with the provision request. These parameters are passed in a valid JSON object containing configuration parameters, provided either in-line or in a file.

  ```
  cf create-service azure-sqldb $service_plan $service_instance_name -c $path_to_parameters
  ```

  Supported configuration parameters:

  ```
  {
    "resourceGroup": "<resource-group>",: "<resource-group>", // [Required] Unique. Only allow up to 90 characters
    "location": "<azure-region-name>",         // [Required] e.g. eastasia, eastus2, westus, etc. You can use azure cli command 'azure location list' to list all locations.
    "sqlServerName": "<sql-server-name>",      // [Required] Unique. sqlServerName cannot be empty or null. It can contain only lowercase letters, numbers and '-', but can't start or end with '-' or have more than 63 characters. 
    "sqlServerCreateIfNotExist": true | false, // If false, location and properties below are optional.
    "sqlServerParameters": {
        "allowSqlServerFirewallRules": [        // [Optional] If present, ruleName, startIpAddress and endIpAddress are mandatory in every rule.
            {
                "ruleName": "<rule-name-1>",
                "startIpAddress": "xx.xx.xx.xx",
                "endIpAddress": "xx.xx.xx.xx"
            },
            {
                "ruleName": "<rule-name-1>",
                "startIpAddress": "xx.xx.xx.xx",
                "endIpAddress": "xx.xx.xx.xx"
            }
        ],
        "location": "<azure-region-name>",
        "properties": {
            "administratorLogin": "<sql-server-admin-name>",
            "administratorLoginPassword": "<sql-server-admin-password>"
        }
    },
    "sqldbName": "<sql-database-name>",    // [Required] Not more than 128 characters. Can't end with '.' or ' ', can't contain '<,>,*,%,&,:,\,/,?' or control characters.
    "sqldbParameters": {                   // If you want to set more child parameters, see details here: https://msdn.microsoft.com/en-us/library/azure/mt163685.aspx
        "location": "<azure-region-name>",
        "properties": {
            "collation": "SQL_Latin1_General_CP1_CI_AS | <or-other-valid-sqldb-collation>"
        }
    }
  }
  ```

  For example:

  ```
  cf create-service azure-sqldb basic mysqldb -c examples/sqldb-example-config.json
  ```

  The contents of `examples/sqldb-example-config.json`:

  ```
  {
    "resourceGroup": "sqldbResourceGroup",
    "location": "westus",
    "sqlServerName": "sqlservera",
    "sqlServerCreateIfNotExist": true,
    "sqlServerParameters": {
        "allowSqlServerFirewallRules": [
            {
                "ruleName": "rule0",
                "startIpAddress": "1.1.1.1",
                "endIpAddress": "1.1.1.10"
            },
            {
                "ruleName": "rule1",
                "startIpAddress": "2.2.2.2",
                "endIpAddress": "2.2.2.20"
            },
        ],
        "location": "westus",
        "properties": {
            "administratorLogin": "myusername",
            "administratorLoginPassword": "mypassword"
        }
    },
    "sqldbName": "sqlDbA",
    "sqldbParameters": {
        "location": "westus",
        "properties": {
            "collation": "SQL_Latin1_General_CP1_CI_AS"
        }
    }
  }
  ```

**NOTE:**

  * To see a list of collation values valid for use with Azure SQL Database, use this query:

    ```
    SELECT name, description
    FROM fn_helpCollations()
    ```

  * If you want to set more child parameters in sqldbParameters, see details here: https://msdn.microsoft.com/en-us/library/azure/mt163685.aspx

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
    "administratorLogin": "ulrich",
    "administratorLoginPassword": "u1r8chP@ss",
    "sqlServerName": "sqlservera",
    "sqldbName": "sqlDbA"
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
