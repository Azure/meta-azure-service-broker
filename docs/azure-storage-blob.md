# Azure Storage Blob Service

[Azure Storage Service](https://azure.microsoft.com/en-us/services/storage/) offers reliable, economical cloud storage for data big and small. This broker currently publishes a single service and plan for provisioning Azure Storage Blob Service.

## Create an Azure storage blob service

1. Get the service name and plans

  ```
  cf marketplace
  ```

2. Create a service instance

  ```
  cf create-service azurestorageblob default <service-instance-name>
  ```

  For example:

  ```
  cf create-service azurestorageblob default myblobservice
  ```

  Additional configuration parameters are supported with the provision request. These parameters are passed in a valid JSON object containing configuration parameters, provided either in-line or in a file. If these parameters are not provided, the broker will create the resources according to [Naming Conventions](#naming-conventions).

  ```
  cf create-service azurestorageblob default <service-instance-name> -c /tmp/config.json
  ```

  Supported configuration parameters:
  ```
  {
    "resource_group_name": "<resource-group-name>",
    "storage_account_name": "<storage-account-name>",
    {
      "location": "<location>",
      "account_type": "<account-type>"
    }
  }
  ```

  For example:

  ```
  {
    "resource_group_name": "myResourceGroup",
    "storage_account_name": "mystorageaccount",
    {
      "location": "eastus",
      "account_type": "Standard_LRS"
    }
  }
  ```

3. Check the operation status of creating the service instance

  The creating operation is asynchronous. You can get the operation status after the creating operation.

  ```
  cf service myblobservice
  ```

[More information](http://docs.cloudfoundry.org/devguide/services/managing-services.html#create).

## Using the services in your application

### Format of Credentials

The credentials provided in a bind call have the following format:

```
"credentials":{
  "container_name": "cloud-foundry-2eac2d52-bfc9-4d0f-af28-c02187689d72",
  "primary_access_key": "PRIMARY-ACCOUNT-KEY",
  "secondary_access_key": "SECONDARY-ACCOUNT-KEY",
  "storage_account_name": "ACCOUNT-NAME"
}
```

### Demo Applications

[Azure Storage Consumer](https://github.com/bingosummer/azure-storage-consumer) is a simple example to use the service.

In the application, you can use Azure SDK for Python to operate your storage account (e.g. put or get your blobs).

```
from azure.storage import BlobService
account_name = vcap_services[service_name][0]['credentials']['storage_account_name']
account_key = vcap_services[service_name][0]['credentials']['primary_access_key']
blob_service = BlobService(account_name, account_key)
```

### Binding

1. Build the demo application

  ```
  git clone https://github.com/bingosummer/azure-storage-consumer
  cd azure-storage-consumer
  cf push --no-start
  ```

2. Bind the service instance to the application

  ```
  cf bind-service azure-storage-consumer myblobservice
  ```

3. Restart the application

  ```
  cf restart azure-storage-consumer
  ```

4. Show the service instance

  ```
  cf services
  ```

5. Verify that the credentials are set as environment variables

  ```
  cf env azure-storage-consumer
  ```

## Unbind and delete the service instance

1. Unbind the application from the service instance

  ```
  cf unbind-service azure-storage-consumer myblobservice
  ```

2. Delete the service instance

  ```
  cf delete-service myblobservice -f
  ```

<a name="naming-conventions" />
## Naming Conventions

A service provisioning call will create Azure Storage Account.

The following names are used and can be customized with a prefix:

Resource         | Name is based on     | Custom Prefix Environment Variable  | Default Prefix    | Example Name  
-----------------|----------------------|-------------------------------------|-------------------|---------------
Azure Resource Group | service instance ID | RESOURCE_GROUP_NAME_PREFIX | cloud-foundry- | cloud-foundry-2eac2d52-bfc9-4d0f-af28-c02187689d72
Azure Storage Account | part of service instance ID | STORAGE_ACCOUNT_NAME_PREFIX | cf | cf2eac2d52bfc94d0faf28c0
Azure Storage Containers | service instance ID | CONTAINER_NAME_PREFIX | cloud-foundry- | cloud-foundry-2eac2d52-bfc9-4d0f-af28-c02187689d72
