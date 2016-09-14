# Test the Broker Locally

## Setup the environment

1. Clone the codes and install dependencies.

  ```
  git clone https://github.com/Azure/meta-azure-service-broker
  cd meta-azure-service-broker
  npm install
  ```

2. Prepare a SQL database.

  1. Create a SQL database.

    You have serveral options to create a SQL database.

    * [Create an Azure SQL database](https://azure.microsoft.com/en-us/documentation/articles/sql-database-get-started/)
    * Create a SQL server VM on Azure

    Note down the `<service-name>`, `<database-name>`, `<username>` and `<password>`.

  2. Create tables in the SQL database.

    1. Use your favorite way to connect to the SQL database.

      For example:

      ```
      sudo npm install -g sql-cli
      mssql --server "<server-name>.database.windows.net" --database <database-name> --user <username>@<server-name> --pass <password> --encrypt
      ```

    2. Create tables `instances` and `bindings` according to [schema.sql](../scripts/schema.sql).

3. Setup the environment variables.

  1. Export the service principal related environment variables.

    ```
    export ENVIRONMENT="REPLACE-ME"
    export CLIENT_ID="REPLACE-ME"
    export CLIENT_SECRET="REPLACE-ME"
    export SUBSCRIPTION_ID="REPLACE-ME"
    export TENANT_ID="REPLACE-ME"
    ```

  2. Export the environment variables about the service broker authentication.
    ```
    export AZURE_SERVICE_BROKER_AUTH_USER="demouser"
    export AZURE_SERVICE_BROKER_AUTH_PASSWORD="demopassword"
    ```

  3. Export the SQL database related environment variables.

    ```
    export AZURE_SERVICE_BROKER_DATABASE_SERVER="<service-name>"
    export AZURE_SERVICE_BROKER_DATABASE_USER="<username>"
    export AZURE_SERVICE_BROKER_DATABASE_PASSWORD="<password>"
    export AZURE_SERVICE_BROKER_DATABASE_NAME="<database-name>"
    ```

  4. Export the Document DB related environment variables.

    ```
    export DOCDB_HOSTENDPOINT="REPLACE-ME"
    export DOCDB_MASTERKEY="REPLACE-ME"
    ```

    To use and test the Document DB service module, you need to specify the above values. Please read [Azure DocumentDB Service](./docs/azure-document-db.md) for more information.

## Run the test cases

After setting up the environment, you can use the following command to run unit tests and integration tests.

```
npm test
```

If you don't want to run a specific case, you can find it in `test/unittestlist.txt` or `test/integration/test-matrix.js`, then comment it out.
