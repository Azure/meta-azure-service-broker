# Test the Broker Locally

## Prerequisites

* Clone the codes and install dependencies.

  ```
  git clone https://github.com/Azure/meta-azure-service-broker
  cd meta-azure-service-broker
  npm install
  ```

## Run test unit tests

```
npm test
```

If you don't want to run a specific case, you can find the line in `test/unittestlist.txt`, then comment out the line.
If you want to run the cases in a specific file, you can use `../node_modules/mocha/bin/mocha -u tdd -t 200000 -R list -- <TEST-FILE-NAME>`.

## Run the integration tests

1. Prepare a SQL database.

  1. Create a SQL database.

    You have serveral options to create a SQL database.

    * [Create an Azure SQL database](https://azure.microsoft.com/en-us/documentation/articles/sql-database-get-started/)
    * Create a SQL server on Azure

    Note down the `<service-name>`, `<database-name>`, `<username>` and `<password>`.

  2. Create tables in the SQL database.

    1. Use your favorite way to connect to the SQL database.

      For example:

      ```
      sudo npm install -g sql-cli
      mssql --server "<server-name>.database.windows.net" --database <database-name> --user <username>@<server-name> --pass <password> --encrypt
      ```

    2. Create tables `instances` and `bindings` according to [schema.sql](../scripts/schema.sql).

2. Setup the environment variables.

  1. Export the service principal related environment variables.

    ```
    export ENVIRONMENT="REPLACE-ME"
    export CLIENT_ID="REPLACE-ME"
    export CLIENT_SECRET="REPLACE-ME"
    export SUBSCRIPTION_ID="REPLACE-ME"
    export TENANT_ID="REPLACE-ME"
    ```

  2. Export the environment variables for the service broker authentication.

    ```
    export SECURITY_USER_NAME="demouser"
    export SECURITY_USER_PASSWORD="demopassword"
    ```

  3. Export the broker database related environment variables.

    ```
    export AZURE_BROKER_DATABASE_PROVIDER="sqlserver"
    export AZURE_BROKER_DATABASE_SERVER="<service-name>"
    export AZURE_BROKER_DATABASE_USER="<username>"
    export AZURE_BROKER_DATABASE_PASSWORD="<password>"
    export AZURE_BROKER_DATABASE_NAME="<database-name>"
    ```
  
  4. Export the SQL database module related environment variables. A valid Azure SQL Server is needed in `AZURE_SQLDB_SQL_SERVER_POOL`.
    
    ```
    export AZURE_SQLDB_ALLOW_TO_CREATE_SQL_SERVER="true"
    export AZURE_SQLDB_SQL_SERVER_POOL='[
      {
        "resourceGroup": "REPLACE-ME",
        "location": "REPLACE-ME",
        "sqlServerName": "REPLACE-ME",
        "administratorLogin": "REPLACE-ME",
        "administratorLoginPassword": "REPLACE-ME"
      }
    ]'
    ```
    
3. Run the following commands:

  ```
  npm -s run-script integration
  ```

If you don't want to run a specific case, you can find the lines in `test/integration/test-matrix.js`, then comment out the lines.
