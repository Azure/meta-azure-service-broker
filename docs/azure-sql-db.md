# Azure SQL Database Service

[Azure SQL Database](https://azure.microsoft.com/en-us/documentation/articles/sql-database-technical-overview/) is a relational database service in the cloud based on the market-leading Microsoft SQL Server engine, with mission-critical capabilities.

## Behaviors

### Provision
  
  1. If the server doesn't exist, create a SQL Server.
  
  2. Create a database.
  
### Provision-Poll
  
  1. Check whether creating database succeeds or not.
  
### Bind

  1. Try to login to the master database of the server to create a new Login. If succeeded then go to 3, else go to 2.
  
  2. Add a temporary firwall rule to allow service broker to access the server.
  
  3. Try to login to the new-created database of the server to create a new user for the Login with the name.
  
  4. Grant permission "CONTROL" to the user.
  
  5. Delete the temporary firewall rule.
  
  6. Collect credentials.
  
  **NOTE**: 1. The firewall rule needs to be deleted manually if Bind fails. The rule name should be 'broker-temp-rule-<sqldbName>'.
            2. Permission "CONTROL" in a database: https://msdn.microsoft.com/en-us/library/ms178569.aspx
  
### Unbind

  1. Try to login to the new-created database of the server to drop the user for the Login. If succeeded then go to 3, else go to 2.
  
  2. Add a temporary firwall rule to allow service broker to access the server.
  
  3. Try to login to the master database of the server to drop the Login.
  
  4. Delete the temporary firewall rule.
  
  **NOTE**: The firewall rule needs to be deleted manually if Unbind fails. The rule name should be 'broker-temp-rule-<sqldbName>'.
  
### Deprovision

  1. Delete the database.

### Deprovision-Poll

  1. Check whether deleting database succeeds or not.

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
    "resourceGroup": "<resource-group>",        // [Required] Unique. Only allow up to 90 characters
    "location": "<azure-region-name>",          // [Required] e.g. eastasia, eastus2, westus, etc. You can use azure cli command 'azure location list' to list all locations.
    "sqlServerName": "<sql-server-name>",       // [Required] Unique. sqlServerName cannot be empty or null. It can contain only lowercase letters, numbers and '-', but can't start or end with '-' or have more than 63 characters. 
    "sqlServerParameters": {                    // Remove this block if using existing server
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
        "properties": {
            "administratorLogin": "<sql-server-admin-name>",
            "administratorLoginPassword": "<sql-server-admin-password>"
        }
    },
    "sqldbName": "<sql-database-name>",                         // [Required] Not more than 128 characters. Can't end with '.' or ' ', can't contain '<,>,*,%,&,:,\,/,?' or control characters.
    "sqldbParameters": {                                        // If you want to set more child parameters, see details here: https://msdn.microsoft.com/en-us/library/azure/mt163685.aspx
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
        "properties": {
            "administratorLogin": "myusername",
            "administratorLoginPassword": "mypassword"
        }
    },
    "sqldbName": "sqlDbA",
    "sqldbParameters": {
        "properties": {
            "collation": "SQL_Latin1_General_CP1_CI_AS"
        }
    }
  }
  ```

**NOTE:**

  * If the SQL server which you specify doesn't exist, the broker will check the priviledge of creating server set in broker manifest. A new server will be created if allowed.

  * To see a list of collation values valid for use with Azure SQL Database, use this query:

    ```
    SELECT name, description FROM fn_helpCollations()
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
    "databaseLogin": "ulrich",
    "databaseLoginPassword": "u1r8chP@ss",
    "sqlServerName": "sqlservera",
    "sqldbName": "sqlDbA",
    "jdbcUrl": "jdbc:sqlserver://fake-server.database.windows.net:1433;database=fake-database;user=fake-admin;password=fake-password",
    
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

  **The broker only deletes the SQL database on Azure, and don't delete the SQL server.**

  ```
  cf delete-service $service_instance_name -f
  ```

  For example:

  ```
  cf delete-service mysqldb -f
  ```
