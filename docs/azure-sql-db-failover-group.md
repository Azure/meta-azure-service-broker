# Azure SQL Database Failover Group Service

## Behaviors

### Provision

  1. Create a failover group (the creation of the secondary database is covered by the creation of the failover group).

**NOTE:**

  * This module assumes you already have two existing servers and a database on the primary server, and these servers are provided in the meta service broker manifest file. See the "Modules related configurations" section [here](https://github.com/Azure/meta-azure-service-broker/blob/master/docs/how-admin-deploy-the-broker.md#deploy-the-meta-azure-service-broker-as-an-application-in-cloud-foundry) for details.

  * For the service plan `ExistingDatabaseInFailoverGroup`, the broker only registers the failover as a service instance and won't create a new failover group.

### Provision-Poll

  1. Check whether creating failover group succeeds or not.

### Bind

  1. Login to the primary database, create a new user with password.

  2. Grant permission "CONTROL" to the user.

  3. Collect [credentials](./azure-sql-db-failover-group.md#format-of-credentials).

**NOTE:**

  * Binding would fail after failover because of the change of the primary role. You need to fail back before binding. If you do have a case which needs to bind after failover, please open a Github issue to request our improvement.

  * Permission "CONTROL" has full permissions in a database: https://msdn.microsoft.com/en-us/library/ms178569.aspx

### Unbind

  1. Login to the primary database, drop the user for the Login.

  2. Login to the master database of the server, drop the Login.

**NOTE**:

  * Unbinding would fail after failover because of the change of the primary role. You need to fail back before unbinding. If you do have a case which needs to unbind after failover, please open a Github issue to request our improvement.

### Deprovision

  1. Delete the failover group.


**NOTE**:

  * For the service plan `ExistingDatabaseInFailoverGroup`, the broker only won't delete any Azure resources.

### Deprovision-Poll

  1. Check whether deleting failover group succeeds or not.

  2. Delete the secondary database.

## Create an Azure SQL Database Failover Group service

1. Get the service name and plans

  ```
  cf marketplace
  ```

  Sample output:

  ```
  service                      plans                                                                                                                                                            description
  azure-sqldb-failover-group   SecondaryDatabaseWithFailoverGroup*, ExistingDatabaseInFailoverGroup                                                                                             Azure SQL Database Failover Group Service
  ```

  If you can not find the service name, please use the following command to make the plans public.

  ```
  cf enable-service-access azure-sqldb-failover-group
  ```

2. Create a service instance

#### Create a new failover group

  ```
  cf create-service azure-sqldb-failover-group SecondaryDatabaseWithFailoverGroup $service_instance_name -c $path_to_parameters
  ```

  Required configuration parameters in the JSON file `$path_to_parameters`:

  ```
  {
    "primaryServerName": "sqlservera",
    "primaryDbName": "sqldba",
    "secondaryServerName": "sqlserverb",
    "failoverGroupName": "failovergroupa"
  }
  ```

**NOTE:**

  * Again, this module assumes you already have two existing servers and a database on the primary server, and these servers are provided in the meta service broker manifest file. See the "Modules related configurations" section [here](https://github.com/Azure/meta-azure-service-broker/blob/master/docs/how-admin-deploy-the-broker.md#deploy-the-meta-azure-service-broker-as-an-application-in-cloud-foundry) for details.

#### Register an existing database in an existing failover group

  ```
  cf create-service azure-sqldb-failover-group ExistingDatabaseInFailoverGroup $service_instance_name -c $path_to_parameters
  ```

  Same as above, required configuration parameters in the JSON file `$path_to_parameters`:

  ```
  {
    "primaryServerName": "sqlservera",
    "primaryDbName": "sqldba",
    "secondaryServerName": "sqlserverb",
    "failoverGroupName": "failovergroupa"
  }
  ```

**NOTE:**

  * Again, this service plan won't create or delete any Azure resources. It just registers a database in a failover group as a service instance.

3. Check the operation status of creating the service instance

  The creating operation is asynchronous. You can get the operation status after the creating operation.

  ```
  cf service $service_instance_name
  ```

[More information](http://docs.cloudfoundry.org/devguide/services/managing-services.html#create).

## Using the services in your application

### Binding

  ```
  cf bind-service $app_name $service_instance_name
  ```

### Format of Credentials

  Verify that the credentials are set as environment variables

  ```
  cf env $app_name
  ```

  The credentials have the following format, it keeps consistent format with [the credentials of `azure-sqldb`](./azure-sql-db.md#format-of-credentials) but assign the failover group name as the SQL server name:

  ```
  "credentials": {
    "sqldbName": "sqlDbA",
    "sqlServerName": "fake-failover-group",
    "sqlServerFullyQualifiedDomainName": "fake-failover-group.database.windows.net",
    "databaseLogin": "ulrich",
    "databaseLoginPassword": "u1r8chP@ss",
    "jdbcUrl": "jdbc:sqlserver://fake-failover-group.database.windows.net:1433;database=fake-database;user=fake-admin;password=fake-password;Encrypt=true;TrustServerCertificate=false;HostNameInCertificate=*.database.windows.net;loginTimeout=30",
    "jdbcUrlForAuditingEnabled": "jdbc:sqlserver://fake-failover-group.database.secure.windows.net:1433;database=fake-database;user=fake-admin;password=fake-password;Encrypt=true;TrustServerCertificate=false;HostNameInCertificate=*.database.secure.windows.net;loginTimeout=30",
    "hostname": "fake-failover-group.database.windows.net",
    "port": 1433,
    "name": "sqlDbA",
    "username": "ulrich",
    "password": "u1r8chP@ss",
    "uri": "mssql://ulrich:u1r8chP@ss@fake-failover-group.database.windows.net:1433/sqlDbA?encrypt=true&TrustServerCertificate=false&HostNameInCertificate=*.database.windows.net"
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

## Delete the service instance

  **The broker only deletes the SQL database on Azure, and don't delete the SQL server.**

  ```
  cf delete-service $service_instance_name -f
  ```
