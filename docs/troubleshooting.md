# Troubleshooting

From the [deploying doc](how-admin-deploy-the-broker.md), you will learn that the `meta-azure-service-broker` is pushed as an application to Cloud Foundry. So, you can use the [steps](http://docs.cloudfoundry.org/devguide/deploy-apps/troubleshoot-app-health.html) to troubleshoot application deployment and health.

The following sections describe common issues you might encounter when attempting to deploy and run your service broker, and possible resolutions.

1. The environment and service principal are not configured.

  You may receive the following error message if you run `cf logs meta-azure-service-broker --recent`:

  ```
  Error: please make sure the configurations are correct: ["config.serviceBroker.credentials.authUser","config.serviceBroker.credentials.authPassword","config.database.provider","config.database.server","config.database.user","config.database.password","config.database.database"]
  ```

  If this happens, please follow [the steps](how-admin-deploy-the-broker.md#deploy-meta-azure-service-broker-as-an-app) to configure and deploy the service broker.

1. The roles of the service principal are not configured correctly. [#18](https://github.com/Azure/meta-azure-service-broker/issues/18)

  You may receive the following error message:

  ```
  # cf create-service azure-storageblob standard myblobservice -c ./examples/storageblob-example-config.json
  Creating service instance myblobservice in org default_organization / space azure as admin...
  FAILED
  Server error, status code: 502, error code: 10001, message: Service broker error: The client '4c7a94e7-1462-4808-9077-94df41862a82' with object id '4c7a94e7-1462-4808-9077-94df41862a82' does not have authorization to perform action 'Microsoft.Resources/subscriptions/resourcegroups/write' over scope '/subscriptions/c241176f-318e-4552-8e2b-2d26fecf8095/resourcegroups/craigw-CF'.
  ```

  If this happens, do each of the following:

  * If you want to create all the services, you may need the role `Contributor`.

  * If you do not need to provision all the services, you can follow [RBAC: Built-in roles](https://azure.microsoft.com/en-us/documentation/articles/role-based-access-built-in-roles/) to get the appropriate roles. For example, you can use `Storage Account Contributor` if you only use the service broker to create a storage account.

1. The backend database is not configured correctly.

  Please make sure the following configuration is correct.

  ```
  "database": {
    "provider": "sqlserver",
    "server": "<REPLACE-WITH-AZURE_SERVICE_BROKER_DATABASE_SERVER>",
    "user": "<REPLACE-WITH-AZURE_SERVICE_BROKER_DATABASE_USER>",
    "password": "<REPLACE-WITH-AZURE_SERVICE_BROKER_DATABASE_PASSWORD>",
    "database": "<REPLACE-WITH-AZURE_SERVICE_BROKER_DATABASE_NAME>"
  }
  ```

  For example, if your configurations are:

  ```
  "database": {
    "provider": "sqlserver",
    "server": "myservername.database.windows.net",
    "user": "myusername",
    "password": "mypassword",
    "database": "mydatabasename"
  }
  ```

  You can use the following command to verify. For example, if your configurations are:

  ```
  mssql --server "myservername.database.windows.net" --database "mydatabasename" --user myusername@myservername --pass "mypassword" --encrypt
  ```

  If you can login the database, that means the configuration is correct.

1. The backend database can not be accessed.

  Please follow the [steps](https://azure.microsoft.com/en-us/documentation/articles/sql-database-configure-firewall-settings/) to make sure the SQL database can be accessed by the service broker.

1. If the service instance become an orphan instance, you may hit the following error message.

  ```
  azureuser@binxi022202:~$ cf delete-service mydocdb -f
  Deleting service mydocdb in org default_organization / space azure as admin...
  FAILED
  Server error, status code: 502, error code: 10001, message: Service instance mydocdb: The service broker returned an invalid response for the request to http://meta-azure-service-broker.40.76.50.63.xip.io/v2/service_instances/959c9623-b7bf-4d23-afe8-e2438c5ef0fe. Status Code: 500 Internal Server Error, Body: {"message":"getaddrinfo ENOTFOUND binxi052001docdb.documents.azure.com binxi052001docdb.documents.azure.com:443"}
  ```

  Because of some reason, the DocumentDB database is removed from Azure. The service instance become orphan. In this case, you need to purge the service instance.
 
  ```
  azureuser@binxi022202:~$ cf purge-service-instance mydocdb -f
  ```
 
1. When you create the meta service broker, if you get the following error, the cause may be that a same service broker is created before.

  ```
  Server error, status code: 502, error code: 270012, message: Service broker catalog is invalid: Service ids must be unique, Service name must be unique
  ```

  There are two options to fix this issue.

  * Option 1 (Recommended): Update the service broker.

    ```
    cf update-service-broker demo-service-broker $authUser $authPassword <URL of the app meta-azure-service-broker>
    ```

  * Option 2

    1. Remove the previous service broker and the services it created.

      ```
      cf delete-service SERVICE_INSTANCE
      cf delete-service-broker SERVICE_BROKER
      ```

    2. Re-create the service broker.

      ```
      cf create-service-broker demo-service-broker $authUser $authPassword <URL of the app meta-azure-service-broker>
      ```

1. If you hit a DNS resolving issue, you need to retry the CF CLI command.

  For example:

  ```
  $ ~/azure-storage-consumer$ cf bind-service azure-storage-consumer myblobservice
  Binding service myblobservice to app azure-storage-consumer in org default_organization / space azure as admin...
  FAILED
  Server error, status code: 502, error code: 10001, message: The service broker could not be reached: http://meta-azure-service-broker.40.76.50.63.xip.io/v2/service_instances/ef91a753-233d-444d-8210-c440ed8a6470/service_bindings/672972b0-3f04-44da-8635-eca4626902ea
  ```

  Retry the CF CLI command.

  ```
  $ ~/azure-storage-consumer$ cf bind-service azure-storage-consumer myblobservice
  Binding service myblobservice to app azure-storage-consumer in org default_organization / space azure as admin...
  OK
  ```

1. If you hit status code 409, which is a Resource Conflict issue...

  1. Type A:
  
    ```
    FAILED
    Server error, status code: 409, error code: 10001, message: Service broker error: The storage account named teststorage is already taken.
    ```
  
    The resource with the name is already existed on Azure. Please try another resource name according to the message.
    
  2. Type B:
  
    ```
    FAILED
    Server error, status code: 409, error code: 10001, message: Service broker error: Failed in inserting the record for (instanceId: 7fad8e93-f124-48b7-8736-47750d2d7c7c) into the broker database. It is caused by that a record with the same azureInstanceId exists. DB Error: {"name":"RequestError","message":"Violation of UNIQUE KEY constraint 'UQ__instance__78EDBBCE6074808B'. Cannot insert duplicate key in object 'dbo.instances'. The duplicate key value is (azure-storage-teststorage).","code":"EREQUEST","number":2627,"lineNumber":1,"state":1,"class":14,"serverName":"testsql","procName":"","precedingErrors":[]}
    ```

    Error occurs in the broker database. The same resource name of the service is found in the database. It is because another service instance has taken the resource name.
    You should try another one.
  
    Or a service instance with the resource name was purged by **cf purge-service-instance <service-instance-name>**.
    If you are sure it is this case, you could use following SQL to delete the invalid record:
  
    ```
    SELECT * FROM instances WHERE parameters LIKE '%"<resource-name-parameter>":"<resource-name>"%'
    ```
    
    for example:
  
    ```
    SELECT * FROM instances WHERE parameters LIKE '%"storage_account_name":"storageil3l080br05no4n1"%'
    ```
  
    If deleting failed because of foreign key, please use following SQL to delete the corresponding record in the table **bindings**:
  
    ```
    SELECT * FROM bindings WHERE parameters LIKE '%"<resource-name-parameter>":"<resource-name>"%'
    ```
  
## Appendix

* [Troubleshooting Application Deployment and Health](http://docs.cloudfoundry.org/devguide/deploy-apps/troubleshoot-app-health.html)

* [Troubleshooting Applications](http://docs.cloudfoundry.org/running/troubleshooting/troubleshooting-apps.html)

* [The troubleshooting doc of Cloud Foundry on Azure](https://github.com/cloudfoundry-incubator/bosh-azure-cpi-release/blob/master/docs/additional-information/troubleshooting.md)

* [Service Broker API](http://docs.cloudfoundry.org/services/api.html)
