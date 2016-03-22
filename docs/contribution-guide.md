# Contribution Guidance

## Test Locally

1. Setup the environment variables.

  ```
  export environment="AzureCloud"
  export client_id="REPLACE-ME"
  export client_secret="REPLACE-ME"
  export subscription_id="REPLACE-ME"
  export tenant_id="REPLACE-ME"
  ```

2. Clone the codes and install dependencies.

  ```
  git clone https://github.com/bingosummer/meta-azure-service-broker
  cd meta-azure-service-broker
  npm install
  ```

3. Start the server.

  1. Create a SQL database.

    You have serveral options to create a SQL database.

    * [Create an Azure SQL database](https://azure.microsoft.com/en-us/documentation/articles/sql-database-get-started/)
    * Create a SQL server VM on Azure

  2. Update the configurations.

    ```
    cp config/meta-service-broker-sql.json config/meta-service-broker.json
    ```

    Update `config/meta-service-broker.json` with the configurations of the SQL database.

  3. Start the server.

    ```
    node index.js
    ```

    By default, the server will be running on `localhost:5001`.

5. Run the following scripts in [scripts/operations/](../scripts/operations/).

  * `./catalog`
  * `./provision`
  * `./poll`
  * `./bind`
  * `./unbind`
  * `./deprovision`

  1. Update `service_id` and `plan_id` according to the service which you want to test.

    For example, if you want to test `azurestorageblob` service, you need to make sure that `service_id` and `plan_id` are set properly according to [the service offerings](../lib/services/azurestorageblob/catalog.json).

  2. Update `parameters` if it is supported by the service.

    For example, `azurestorageblob` service allows users to specify the storage account name when provisioning.
