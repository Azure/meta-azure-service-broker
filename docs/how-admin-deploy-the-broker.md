# How a Cloud Foundry Admin manages the meta Azure service broker

## Deploy the meta Azure service broker as an application in Cloud Foundry

1. Get the source code from Github.

  ```
  git clone https://github.com/Azure/meta-azure-service-broker
  cd meta-azure-service-broker
  ```

2. Update `config/default.json`.

  1. Create a SQL database.

    You have several options to create a SQL database.

    * [Create an Azure SQL database](https://azure.microsoft.com/en-us/documentation/articles/sql-database-get-started/)
    * Create a SQL server VM on Azure
    
    **Please ensure you've created a server-level firewall rule.**

  2. Create tables in the SQL database.

    1. Use your favorite way to connect to the SQL database.

      For example:

      ```
      sudo npm install -g sql-cli
      mssql --server "<server-name>.database.windows.net" --database <database> --user <username>@<server-name> --pass <pass> --encrypt
      ```

    2. Create tables `instances` and `bindings` according to [schema.sql](../scripts/schema.sql).

  2. Update the configurations.

    Update `config/default.json` with the configurations of the SQL database.

3. Update `manifest.yml` with your credentials.

  ```
  environment: REPLACE-ME
  subscription_id: REPLACE-ME
  tenant_id: REPLACE-ME
  client_id: REPLACE-ME
  client_secret: REPLACE-ME
  ```

  Two options `AzureCloud` and `AzureChinaCloud` are supported for `environment`.

  A [service principal](https://azure.microsoft.com/en-us/documentation/articles/resource-group-create-service-principal-portal/) is composed of `tenant_id`, `client_id` and `client_secret`.

  If you want to enable the DocumentDB service, you need to specify the following values. Please ignore them if you do not want to enable the DocumentDB service. Please read [Azure DocumentDB Service](./docs/azure-document-db.md) for more information.

  ```
  docDb_hostEndPoint: REPLACE-ME
  docDb_masterKey: REPLACE-ME
  ```

4. Push the broker to Cloud Foundry

  ```
  cf push
  ```

## Register a service broker

```
cf create-service-broker demo-service-broker $authUser $authPassword <URL of the app meta-azure-service-broker>
```

`$authUser` and `$authPassword` should be same as the ones in `config/default.json`.

## Make the plans public

```
cf enable-service-access $service-name
```

For example:

```
cf enable-service-access azurestorageblob
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

## More information

[Managing Service Brokers](http://docs.cloudfoundry.org/services/managing-service-brokers.html)
