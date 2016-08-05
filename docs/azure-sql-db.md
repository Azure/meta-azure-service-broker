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
  azure-sqldb   basic*, StandardS0*, StandardS1*, StandardS2*, StandardS3*, PremiumP1*, PremiumP2*, PremiumP4*, PremiumP6*, PremiumP11*    Azure SQL Database Service
  ```
  \* These service plans have an associated cost. Creating a service instance will incur this cost.

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
    "location": "<azure-region-name>",         // [Required]
    "sqlServerName": "<sql-server-name>",      // [Required] Unique. Servername cannot be empty or null. It can only be made up of lowercase letters 'a'-'z', the numbers 0-9 and the hyphen. The hyphen may not lead or trail in the name.
    "sqlServerCreateIfNotExist": true | false, // If false, location and properties below are optional.
    "sqlServerParameters": {
        "allowSqlServerFirewallRule": {        // [Optional] If present, ruleName and startIpAddress are mandatory.  If endIpAddress is absent, it is assumed to be equal to startIpAddress.
            "ruleName": "<rule-name>",
            "startIpAddress": "xx.xx.xx.xx",
            "endIpAddress": "xx.xx.xx.xx"
        },
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
        "allowSqlServerFirewallRule": {
            "ruleName": "new rule",
            "startIpAddress": "131.107.159.102",
            "endIpAddress": "131.107.159.102"
        },
        "location": "westus",
        "properties": {
            "administratorLogin": "ulrich",
            "administratorLoginPassword": "u1r8chP@ss"
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
NOTE: Servername cannot be empty or null. It can only be made up of lowercase letters 'a'-'z', the numbers 0-9 and the hyphen. The hyphen may not lead or trail in the name.

NOTE: The 'allowSqlServerFirewallRule' object is optional. If present, ruleName and startIpAddress are mandatory.  If endIpAddress is absent, it is assumed to be equal to startIpAddress.  If sqlServerCreateIfNotExist is false, location and properties are optional.

NOTE: To see a list of collation values valid for use with Azure SQL Database, use this query:

SELECT name, description
FROM fn_helpCollations()

NOTE: If you want to set more child parameters in sqldbParameters, see details here: https://msdn.microsoft.com/en-us/library/azure/mt163685.aspx

**Please remove the comments in the JSON file before you use it.**

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
