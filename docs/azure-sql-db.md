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
  1. Change the SQL Server password in the broker database to the supplied one.

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
      }
    },
    "sqldbName": "<sql-database-name>",                         // [Required] Not more than 128 characters. Can't end with '.' or ' ', can't contain '<,>,*,%,&,:,\,/,?' or control characters.
    "transparentDataEncryption": true | false,                  // Enable Transparent Data Encryption on the database. Defaults to false.
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
    "jdbcUrlForAuditingEnabled": "jdbc:sqlserver://fake-server.database.secure.windows.net:1433;database=fake-database;user=fake-admin;password=fake-password;Encrypt=true;TrustServerCertificate=false;HostNameInCertificate=*.database.secure.windows.net;loginTimeout=30"
  }

  ```

**NOTE:**

  * If using `jdbcUrlForAuditingEnabled` on Azure China Cloud, you need to:

      1. Follow this [doc](https://www.azure.cn/documentation/articles/aog-web-app-java-import-wosign-certification/) to import a certification to a key store file `cacerts`.

      2. Follow this [doc](https://github.com/cloudfoundry/java-buildpack/blob/master/docs/jre-open_jdk_jre.md#custom-ca-certificates), fork the [official java buildpack](https://github.com/cloudfoundry/java-buildpack) and add the `cacerts`.

      3. Push your app with the customized buildpack in #2.

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
