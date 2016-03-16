# Meta Azure Service Broker

[Cloud Foundry on Azure is generally available.](https://azure.microsoft.com/en-us/blog/general-availability-of-cloud-foundry-and-preview-access-of-pivotal-cloud-foundry/) If you want to try it, please follow [the guidance](https://github.com/cloudfoundry-incubator/bosh-azure-cpi-release/blob/master/docs/guidance.md).

## Design

The broker uses Azure Table Service (should be replaced with Azure SQL Server Service) and naming conventions to maintain the state of the services it is brokering.

Capability with the Cloud Foundry service broker API is indicated by the project version number. For example, version 2.8.0 is based off the 2.8 version of the broker API.

## The provided services

* [Azure Storage Blob Service](./services/azurestorageblob/)

## How to deploy your service and application in Cloud Foundry

1. Deploy the service broker

  1. Get the source code from Github.

    ```
    git clone https://github.com/bingosummer/meta-azure-service-broker
    cd meta-azure-service-broker
    ```

  2. Update `config/meta-service-broker.json`.

  3. Update `manifest.yml` with your credentials.

    ```
    subscription_id: REPLACE-ME
    tenant_id: REPLACE-ME
    client_id: REPLACE-ME
    client_secret: REPLACE-ME
    ```

    A [service principal](https://azure.microsoft.com/en-us/documentation/articles/resource-group-create-service-principal-portal/) is composed of `tenant_id`, `client_id` and `client_secret`.

  4. Push the broker to Cloud Foundry

    ```
    cf push
    ```

2. Create a service broker

  ```
  cf create-service-broker demo-service-broker <authUser> <authPassword> <URL of the app meta-azure-service-broker>
  ```

  `<authUser>` and `<authPassword>` should be same as the ones in `config/meta-service-broker.json`.

3. Make the service public

  ```
  cf enable-service-access azurestorageblob
  ```

4. Show the service in the marketplace 

  ```
  cf marketplace
  ```

5. Create a service instance

  ```
  cf create-service azurestorageblob default myblobservice
  ```

6. Check the operation status of creating the service instance

  The creating operation is asynchronous. You can get the operation status after the creating operation.

  ```
  cf service myblobservice
  ```

7. Build the demo application

  ```
  git clone https://github.com/bingosummer/azure-storage-consumer
  cd azure-storage-consumer
  cf push --no-start
  ```

8. Bind the service instance to the application

  ```
  cf bind-service azure-storage-consumer myblobservice
  ```

9. Restart the application

  ```
  cf restart azure-storage-consumer
  ```

10. Show the service instance

  ```
  cf services
  ```

11. Get the environment variables of the application

  ```
  cf env azure-storage-consumer
  ```

12. Unbind the application from the service instance

  ```
  cf unbind-service azure-storage-consumer myblobservice
  ```

13. Delete the service instance

  ```
  cf delete-service myblobservice -f
  ```

14. Delete the service broker instance

  ```
  cf delete-service-broker demo-service-broker -f
  ```

15. Delete the service broker

  ```
  cf delete meta-azure-service-broker -f -r
  ```

16. Delete the application

  ```
  cf delete azure-storage-consumer -f -r
  ```

## Test Locally

1. Setup the environment variables.

  ```
  export client_id="REPLACE-ME"
  export client_secret="REPLACE-ME"
  export subscription_id="REPLACE-ME"
  export tenant_id="REPLACE-ME"
  ```

2. Start the server.

  ```
  npm install
  node index.js
  ```

3. Run the test commands.

  * `test/provision`
  * `test/poll`
  * `test/bind`
  * `test/unbind`
  * `test/deprovision`

## More information

http://docs.cloudfoundry.org/services/
