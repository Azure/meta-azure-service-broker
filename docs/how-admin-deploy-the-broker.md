# How a Cloud Foundry Admin manages the meta Azure service broker

## Prerequisites

* Install git on your machine, no matter it is a local workstation or the devbox on Azure.

* Install [CF CLI](https://github.com/cloudfoundry/cli), and login to Cloud Foundry. Please refer to [Login CF](https://github.com/cloudfoundry-incubator/bosh-azure-cpi-release/blob/master/docs/get-started/push-demo-app.md#1-configure-cf-environment).

* A SQL database to store the data of the meta service broker

  1. Create a SQL server and SQL database.

    You have several options to create a SQL database.

    * [Create an Azure SQL database](https://azure.microsoft.com/en-us/documentation/articles/sql-database-get-started/)
    * Create a SQL server VM on Azure
    
  2. Configure an Azure SQL Database server-level firewall rule

    Please follow the [steps](https://azure.microsoft.com/en-us/documentation/articles/sql-database-configure-firewall-settings/) to make sure the SQL database can be accessed by the service broker.

  3. Create tables in the SQL database.

    Use your favorite way to connect to the SQL database.

      For example:

      ```
      sudo npm install -g sql-cli
      mssql --server "<server-name>.database.windows.net" --database <database> --user <username>@<server-name> --pass <pass> --encrypt
      ```

    In the `mssql` command line, create tables `instances` and `bindings` by pasting the contents of [schema.sql](../scripts/schema.sql).

<a name="deploy-meta-azure-service-broker-as-an-app" />
## Deploy the meta Azure service broker as an application in Cloud Foundry

1. Get the source code from Github.

  ```
  git clone https://github.com/Azure/meta-azure-service-broker
  cd meta-azure-service-broker
  ```

2. Update `manifest.yml` with your credentials.

  The contents of `manifest.yml` are:

  ```
  ---
  applications:
  - name: meta-azure-service-broker
    buildpack: https://github.com/cloudfoundry/nodejs-buildpack
    instances: 1
    env:
      ENVIRONMENT: REPLACE-ME
      SUBSCRIPTION_ID: REPLACE-ME
      TENANT_ID: REPLACE-ME
      CLIENT_ID: REPLACE-ME
      CLIENT_SECRET: REPLACE-ME
      SECURITY_USER_NAME: REPLACE-ME
      SECURITY_USER_PASSWORD: REPLACE-ME
      AZURE_BROKER_DATABASE_PROVIDER: REPLACE-ME
      AZURE_BROKER_DATABASE_SERVER: REPLACE-ME
      AZURE_BROKER_DATABASE_USER: REPLACE-ME
      AZURE_BROKER_DATABASE_PASSWORD: REPLACE-ME
      AZURE_BROKER_DATABASE_NAME: REPLACE-ME
  ```

  * `ENVIRONMENT`

    Two options `AzureCloud` and `AzureChinaCloud` are supported as an `ENVIRONMENT`. For example, if you want to create services in `AzureChinaCloud`, you should specify `AzureChinaCloud` as the `ENVIRONMENT`.

    The following table is about the support for each service in different environments.

    | Service Name | AzureCloud | AzureChinaCloud |
    |:---|:---|:---|
    | DocumentDB Service | yes | yes |
    | Event Hub Service | yes | yes |
    | Redis Cache Service | yes | yes |
    | Service Bus Service | yes | yes |
    | Storage Service | yes | yes |
    | SQL Database Service | yes | yes |

  * `SUBSCRIPTION_ID`

    You can list the providers in the subscription, and make sure that the namespace is registered. For example, if you want to enable Service Bus service, `Microsoft.ServiceBus` should be registered. If the specific provider is not registered, you need to run `azure provider register <PROVIDER-NAME>` to register it.

    ```
    $ azure provider list
    info:    Executing command provider list
    + Getting ARM registered providers
    data:    Namespace                  Registered
    data:    -------------------------  -------------
    data:    Microsoft.Batch            Registered
    data:    Microsoft.Cache            Registered
    data:    Microsoft.Compute          Registered
    data:    Microsoft.DocumentDB       Registered
    data:    Microsoft.EventHub         Registered
    data:    microsoft.insights         Registered
    data:    Microsoft.KeyVault         Registered
    data:    Microsoft.MySql            Registered
    data:    Microsoft.Network          Registering
    data:    Microsoft.ServiceBus       Registered
    data:    Microsoft.Sql              Registered
    data:    Microsoft.Storage          Registered
    data:    Microsoft.ApiManagement    NotRegistered
    data:    Microsoft.Authorization    Registered
    data:    Microsoft.ClassicCompute   NotRegistered
    data:    Microsoft.ClassicNetwork   NotRegistered
    data:    Microsoft.ClassicStorage   NotRegistered
    data:    Microsoft.Devices          NotRegistered
    data:    Microsoft.Features         Registered
    data:    Microsoft.HDInsight        NotRegistered
    data:    Microsoft.Resources        Registered
    data:    Microsoft.Scheduler        Registered
    data:    Microsoft.ServiceFabric    NotRegistered
    data:    Microsoft.StreamAnalytics  NotRegistered
    data:    Microsoft.Web              NotRegistered
    info:    provider list command OK
    ```

  * `TENANT_ID`, `CLIENT_ID` and `CLIENT_SECRET`

    A [service principal](https://azure.microsoft.com/en-us/documentation/articles/resource-group-create-service-principal-portal/) is composed of `TENANT_ID`, `CLIENT_ID` and `CLIENT_SECRET`.

    In [Azure CPI guidance](https://github.com/cloudfoundry-incubator/bosh-azure-cpi-release/tree/master/docs), the roles `Virtual Machine Contributor` and `Network Contributor` are recommended to deploy Cloud Foundry on Azure. However, for the service broker, these two roles are not enough. You can follow [RBAC: Built-in roles](https://azure.microsoft.com/en-us/documentation/articles/role-based-access-built-in-roles/) to get the appropriate roles.

    For example, you can use `Storage Account Contributor` if you only use the service broker to create a storage account.

    If you want to create all the services, you may need the role `Contributor`.

  * `SECURITY_USER_NAME` and `SECURITY_USER_PASSWORD`

    Cloud Controller authenticates with the Broker using HTTP basic authentication (the `Authorization:` header) on every request and will reject any broker registrations that do not contain a username and password. `SECURITY_USER_NAME` and `SECURITY_USER_PASSWORD` are the username and password of HTTP basic authentication. They are maken up by yourself. When you register the service broker using `cf create-service-broker`, the same values should be used.

  * Database related configurations

    ```
    AZURE_BROKER_DATABASE_PROVIDER: REPLACE-ME
    AZURE_BROKER_DATABASE_SERVER: REPLACE-ME
    AZURE_BROKER_DATABASE_USER: REPLACE-ME
    AZURE_BROKER_DATABASE_PASSWORD: REPLACE-ME
    AZURE_BROKER_DATABASE_NAME: REPLACE-ME
    ```

    Currently, only `sqlserver` is supported for `AZURE_BROKER_DATABASE_PROVIDER`.

    ```
    AZURE_BROKER_DATABASE_PROVIDER: sqlserver
    AZURE_BROKER_DATABASE_SERVER: <sql-server-name>.database.windows.net
    AZURE_BROKER_DATABASE_USER: <username>
    AZURE_BROKER_DATABASE_PASSWORD: <password>
    AZURE_BROKER_DATABASE_NAME: <database-name>
    ```

3. Update `config/default.json`. (Optional)

    The configurations include three parts. These configurations are same as the environment variables in the manifest. If you have configured the manifest, you do not need to update `config/default.json`. If both `manifest.yml` and `config/default.json` are configured, the configurations in `manifest.yml` will overwrite the configurations in `config/default.json`.

    1. `azure` includes the service principal and the Azure DocumentDB Host information.

      For example:

      ```
      "azure": {
        "environment": "AzureCloud",
        "subscriptionId": "55555555-4444-3333-2222-111111111111",
        "tenantId": "66666666-4444-3333-2222-111111111111",
        "clientId": "77777777-4444-3333-2222-111111111111",
        "clientSecret": "your-client-secret"
      },
      ```


    2. `authUser` and `authPassword` are specified by yourself. They are the username and password of HTTP basic authentication.

    3. Update the configurations for the SQL database. For example:

      ```
      "database": {
        "provider": "sqlserver",
        "server": "<sql-server-name>.database.windows.net",
        "user": "<username>",
        "password": "<password>",
        "database": "<database>"
      }
      ```

4. Push the broker to Cloud Foundry

  ```
  cf push
  ```

## Register a service broker

```
cf create-service-broker demo-service-broker $authUser $authPassword <URL of the app meta-azure-service-broker>
```

`$authUser` and `$authPassword` should be same as the values of the environment variables `SECURITY_USER_NAME` and `SECURITY_USER_PASSWORD`.

For example,

```
cf create-service-broker demo-service-broker demouser demopassword http://meta-azure-service-broker.<ip-address>.xip.io
```

## Make the plans public

```
cf enable-service-access $service-name
```

For example:

```
cf enable-service-access azure-storage
```

Show the services in the marketplace to verify they are ready.

```
cf marketplace
```

## Unregister a service broker

```
cf delete-service-broker demo-service-broker -f
```

## Debug logging

By default, the debug logging is disabled. If you want to enable the debug logging, please remove `debug` from the `suppress` list in `.logule.json`. Here is the [reference](https://github.com/clux/logule#configuration).

```
"stdout"    : {
  "pad"       : 0,
  "delimiter" : " - ",
  "nesting"   : 3,
  "mutable"   : true,
  "timestamp" : "toLocaleTimeString",
  "suppress"  : ["debug"]
},
```

You can enable the debug logging when you deploy the service broker at the first time. Then you will get the debug messages. On the other hand, you can also enable it after the service broker is registered, but you need to update the service broker. The steps:

1. Enable debug logging in `.logule.json`.

2. Re-push the broker to Cloud Foundry.

3. Update the service broker.

  ```
  cf update-service-broker demo-service-broker $authUser $authPassword <URL of the app meta-azure-service-broker>
  ```

## More information

[Managing Service Brokers](http://docs.cloudfoundry.org/services/managing-service-brokers.html)
