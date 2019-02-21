# Azure SQL Database Service

[Azure SQL Database](https://azure.microsoft.com/en-us/documentation/articles/sql-database-technical-overview/) is a relational database service in the cloud based on the market-leading Microsoft SQL Server engine, with mission-critical capabilities.

## Behaviors

### Provision

  1. If the server dose not exist, and the operator allows the service broker to create a new server, then create the SQL server.

  2. Create a database.

**NOTE:**

  * The operator can enable or disable the option for SQL service broker to create new server, in the meta service broker manifest file, see the "Modules related configurations" section [here](https://github.com/Azure/meta-azure-service-broker/blob/master/docs/how-admin-deploy-the-broker.md#deploy-the-meta-azure-service-broker-as-an-application-in-cloud-foundry) for details.

### Provision-Poll

  1. Check whether creating database succeeds or not.

  2. Enable [Transparent Data Encryption](https://msdn.microsoft.com/en-us/library/dn948096.aspx) if it is turned on in the configuration.

### Bind

  1. Login to the master database, create Login with generated name and password by following SQL server password policy.

  2. Login to the newly created database, create a new user for the Login with the name.

  3. Login to the newly created database, grant permission "CONTROL" to the user.

  4. Collect [credentials](./azure-sql-db.md#format-of-credentials).

**NOTE:**

  * A temporary firewall rule will be created to allow service broker to access the server if some login was refused by firewall. And it will be deleted after the last login.

  * Maybe the temporary firewall rule needs to be deleted manually if Bind fails. The rule name is 'broker-temp-rule-\<sqldbName>'.

  * The concepts of Login and User in SQL server: https://msdn.microsoft.com/en-us/library/aa337562.aspx

  * Permission "CONTROL" has full permissions in a database: https://msdn.microsoft.com/en-us/library/ms178569.aspx

### Unbind

  1. Login to the newly created database, drop the user for the Login.

  2. Login to the master database of the server, drop the Login.

**NOTE**:

  * A temporary firewall rule will be created to allow service broker to access the server if some login was refused by firewall. And it will be deleted after the last login.

  * Maybe the temporary firewall rule needs to be deleted manually if Unbind fails. The rule name is 'broker-temp-rule-\<sqldbName>'.

### Deprovision

  1. Delete the database.

### Deprovision-Poll

  1. Check whether deleting database succeeds or not.

### Update
  1. Change the SQL Server password in the broker database to the supplied one or change the service plan.

## Create an Azure SQL Database service

1. Get the service name and plans

  ```
  cf marketplace
  ```

  Sample output:

  ```
  service         plans                                                                                                                                                            description
  azure-sqldb     basic*, StandardS0*, StandardS1*, StandardS2*, StandardS3*, PremiumP1*, PremiumP2*, PremiumP4*, PremiumP6*, PremiumP11*, DataWarehouse100*, DataWarehouse1200*   Azure SQL Database Service
  ```

  If you can not find the service name, please use the following command to make the plans public.

  ```
  cf enable-service-access azure-sqldb
  ```

2. Create a service instance

#### Create a datbase on a new server

  Configuration parameters are supported with the provision request. These parameters are passed in a valid JSON object containing configuration parameters, provided either in-line or in a file.

  ```
  cf create-service azure-sqldb $service_plan $service_instance_name -c $path_to_parameters
  ```
  
  Supported configuration parameters:

  ```
  {
    "resourceGroup": "<resource-group>",        // [Required] Unique. Only allow up to 90 characters
    "location": "<azure-region-name>",          // [Required] e.g. eastasia, eastus2, westus, etc. You can use azure cli command 'az account list-locations' to list all locations.
    "sqlServerName": "<sql-server-name>",       // [Required] Unique. sqlServerName cannot be empty or null. It can contain only lowercase letters, numbers and '-', but can't start or end with '-' or have more than 63 characters.
    "sqlServerParameters": {
      "allowSqlServerFirewallRules": [          // [Optional] If present, ruleName, startIpAddress and endIpAddress are mandatory in every rule.
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
         "administratorLogin": "<sql-server-admin-name>",
         "administratorLoginPassword": "<sql-server-admin-password>"
      },
      "connectionPolicy": "<policy>"            // [Optional] The acceptable values are: "Default" | "Redirect" | "Proxy". The default value is "Default". See details: https://docs.microsoft.com/en-us/azure/sql-database/sql-database-connectivity-architecture
    },
    "sqldbName": "<sql-database-name>",         // [Required] Not more than 128 characters. Can't end with '.' or ' ', can't contain '<,>,*,%,&,:,\,/,?' or control characters.
    "transparentDataEncryption": true | false,  // Enable Transparent Data Encryption on the database. Defaults to false.
    "sqldbParameters": {                        // If you want to set more child parameters, see details here: https://msdn.microsoft.com/en-us/library/azure/mt163685.aspx
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
      "resourceGroup": "azure-service-broker",
      "location": "eastus",
      "sqlServerName": "generated-string",
      "sqlServerParameters": {
          "allowSqlServerFirewallRules": [
              {
                  "ruleName": "all",
                  "startIpAddress": "0.0.0.0",
                  "endIpAddress": "255.255.255.255"
              }
          ],
          "properties": {
              "administratorLogin": "generated-string",
              "administratorLoginPassword": "generated-string"
          }
      },
      "sqldbName": "generated-string",
      "transparentDataEncryption": true,
      "sqldbParameters": {
          "properties": {
              "collation": "SQL_Latin1_General_CP1_CI_AS"
          }
      }
  }
  ```

  Please refer this [example](../examples/sqldb-example-config-for-server-exists.json) if using existing server specified in the broker manifest.

**NOTE:**

  * If the SQL server which you specify doesn't exist, the broker will check the priviledge of creating server set in broker manifest. A new server will be created if allowed.

  * To see a list of collation values valid for use with Azure SQL Database, use this query:

    ```
    SELECT name, description FROM fn_helpCollations()
    ```

  * If you want to set more child parameters in sqldbParameters, see details here: https://msdn.microsoft.com/en-us/library/azure/mt163685.aspx

  * Please remove the comments in the JSON file before you use it.
  
  Above parameters are also the defaults if the broker operator doesn't change broker default settings. You can just run the following command to create a service instance without the json file:
  
  ```
  cf create-service azure-sqldb basic mysqldb
  ```
  
#### Create a datbase on am existing server

  Parameters can be simpler:
  
  ```
  {
      "sqlServerName": "<sql-server-name>",       // [Required] Unique. sqlServerName cannot be empty or null. It can contain only lowercase letters, numbers and '-', but can't start or end with '-' or have more than 63 characters. 
      "sqldbName": "<sql-database-name>",         // [Required] Not more than 128 characters. Can't end with '.' or ' ', can't contain '<,>,*,%,&,:,\,/,?' or control characters.
      "transparentDataEncryption": true | false,  // Enable Transparent Data Encryption on the database. If not present, it follows the broker manifest. Defaults to false. 
      "sqldbParameters": {                        // If you want to set more child parameters, see details here: https://msdn.microsoft.com/en-us/library/azure/mt163685.aspx
          "properties": {
              "collation": "SQL_Latin1_General_CP1_CI_AS | <or-other-valid-sqldb-collation>"
          }
      }
  }
  ```
  
  For example, to create a database on the existing server named `sqlservera`:
  
  ```
  {
      "sqlServerName": "sqlservera",
      "sqldbName": "generated-string",
      "transparentDataEncryption": true,
      "sqldbParameters": {
          "properties": {
              "collation": "SQL_Latin1_General_CP1_CI_AS"
          }
      }
  }
  ```
  
  Above parameters are also the defaults if the broker operator doesn't change broker default settings. You can just run the following command to create a service instance without the json file:
  
  ```
  cf create-service azure-sqldb basic mysqldb -c '{"sqlServerName": "sqlservera"}'
  ```

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
    "sqldbName": "sqlDbA",
    "sqlServerName": "fake-server",
    "sqlServerFullyQualifiedDomainName": "fake-server.database.windows.net",
    "databaseLogin": "ulrich",
    "databaseLoginPassword": "u1r8chP@ss",
    "jdbcUrl": "jdbc:sqlserver://fake-server.database.windows.net:1433;database=fake-database;user=fake-admin;password=fake-password;Encrypt=true;TrustServerCertificate=false;HostNameInCertificate=*.database.windows.net;loginTimeout=30",
    "jdbcUrlForAuditingEnabled": "jdbc:sqlserver://fake-server.database.secure.windows.net:1433;database=fake-database;user=fake-admin;password=fake-password;Encrypt=true;TrustServerCertificate=false;HostNameInCertificate=*.database.secure.windows.net;loginTimeout=30",
    "hostname": "fake-server.database.windows.net",
    "port": 1433,
    "name": "sqlDbA",
    "username": "ulrich", 
    "password": "u1r8chP@ss",
    "uri": "mssql://ulrich:u1r8chP@ss@fake-server.database.windows.net:1433/sqlDbA?encrypt=true&TrustServerCertificate=false&HostNameInCertificate=*.database.windows.net"
  }

  ```

**NOTE:**

  * If using `jdbcUrlForAuditingEnabled` on Azure China Cloud, you need to:

      1. Follow this [doc](https://www.azure.cn/documentation/articles/aog-web-app-java-import-wosign-certification/) to import a certification to a key store file `cacerts`.

      2. Follow this [doc](https://github.com/cloudfoundry/java-buildpack/blob/master/docs/jre-open_jdk_jre.md#custom-ca-certificates), fork the [official java buildpack](https://github.com/cloudfoundry/java-buildpack) and add the `cacerts`.

      3. Push your app with the customized buildpack in #2.
  
  * The part `hostname` - `uri` is compatible with the community MySQL/PostgreSQL service broker.

## Unbinding

  ```
  cf unbind-service $app_name $service_instance_name
  ```

  For example:

  ```
  cf unbind-service demoapp mysqldb
  ```

## Updating the server instance

  If the password of an SQL server is changed manually, the broker needs to be informed to update it's database entry for the service instance.

  ### Symtom of bad password:

    ```
    cf bind-service my-app my-service
    Server error, status code: 502, error code: 10001, message: Service broker error: Login failed for user 'my-username'.
    ```


  ### Usage
  ```cf update-service my-service -c sqldb-example-update.json```

  Content of ```sqldb-example-update.json```

  ```
  {
      "sqlServerParameters": {
          "properties": {
              "administratorLoginPassword": "newerPassword425"
          }
      }
  }
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

## Update credentials

If the SQL server credentials are modified, the service broker needs to be informed of the change or binding operations will fail.

### As an admin using cf push

1) Simply modify the SQL server password in the manifest.yml file that was used to deploy the broker. `(AZURE_SQLDB_SQL_SERVER_POOL / administratorLoginPassword)`

2) Push the broker with the updated manifest. `cf push -f manifest.yml`

### As a developper using cf update

1) Modify the config.json file used to create the service instance 
```
{
  'sqlServerParameters': {
    'properties': {
      'administratorLoginPassword': 'newPassword425'
    }
  }
}
```

2) Inform the broker. `cf update-service mydb -c config.json`

## Update the service plan

This can be used to change the amount of resources allocated to the service instance.
1) Get the name of the desired new service plan from `cf marketplace`
2) Change the service plan `cf update-service mysqldb -p StandardS0`

***Note:***

Certain updates are not possible. For example, it is not possible to update from a standard plan to a datawarehouse one. 

Example error message for this situation : `"code":"40882","message":"Can not change SLO from DataWarehouse edition to other SQL DB editions and vice versa."`
