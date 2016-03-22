# How Cloud Foundry Admin deploy the meta Azure service broker

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
    environment: AzureCloud
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

## More information

[Integrating Service Instances with Applications in Cloud Foundry](http://docs.cloudfoundry.org/devguide/services/)
