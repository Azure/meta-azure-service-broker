# Azure Storage Service

[Azure Storage Service](https://azure.microsoft.com/en-us/services/storage/) offers reliable, economical cloud storage for data big and small. This broker currently publishes a single service and plan for provisioning Azure Storage Service.

## Behaviors

### Provision
  
  1. Create a Storage Account.
  
### Provision-Poll
  
  1. Check whether creating the Storage Account succeeds or not.
  
### Bind

  1. Collect credentials.

### Unbind
  
  Do nothing.
  
### Deprovision

  1. Delete the Storage Account.

### Deprovision-Poll

  1. Check whether deleting the Storage Account succeeds or not.
  
## Create an Azure storage service

1. Get the service name and plans

  ```
  cf marketplace
  ```

  Sample output:

  ```
  service                       plans                     description
  azure-storage                 standard                  Azure Storage Service
  ```

  If you can not find the service name, please use the following command to make the plans public.

  ```
  cf enable-service-access azure-storage
  ```

2. Create a service instance

  Configuration parameters are passed in a valid JSON object containing configuration parameters, provided either in-line or in a file. If these parameters are not provided, the broker will create the resources according to [Naming Conventions](#naming-conventions).

  ```
  cf create-service azure-storage $service_plan $service_instance_name -c $path_to_parameters
  ```

  Supported configuration parameters:

  ```
  {
    "resource_group_name": "<resource-group-name>",   // [Required] Unique. Only allow up to 90 characters
    "storage_account_name": "<storage-account-name>", // [Required] Unique. Can contain only lowercase letters and numbers. Name must be between 3 and 24 characters.
    "location": "<location>",                         // [Required] e.g. eastasia, eastus2, westus, etc. You can use azure cli command 'azure location list' to list all locations.
    "account_type": "Standard_LRS | <other-account-type>"  // [Required] Possible value: Standard_LRS | Standard_ZRS | Standard_GRS | Standard_RAGRS | Premium_LRS . See more details: https://azure.microsoft.com/en-us/pricing/details/storage/
  }
  ```

  For example:

  ```
  cf create-service azure-storage standard mystorageservice -c examples/storage-example-config.json
  ```

  The contents of `examples/storage-example-config.json`:

  ```
  {
    "resource_group_name": "myResourceGroup",
    "storage_account_name": "mystorageaccount",
    "location": "eastus",
    "account_type": "Standard_LRS"
  }
  ```

  >**NOTE:** Please remove the comments in the JSON file before you use it.

3. Check the operation status of creating the service instance

  The creating operation is asynchronous. You can get the operation status after the creating operation.

  ```
  cf service $service_instance_name
  ```

  For example:

  ```
  cf service mystorageservice
  ```

[More information](http://docs.cloudfoundry.org/devguide/services/managing-services.html#create).

## Using the services in your application

### Format of Credentials

The credentials provided in a bind call have the following format:

```
"credentials":{
  "primary_access_key": "PRIMARY-ACCOUNT-KEY",
  "secondary_access_key": "SECONDARY-ACCOUNT-KEY",
  "storage_account_name": "ACCOUNT-NAME"
}
```

### Demo Applications

[Azure Storage Consumer](https://github.com/bingosummer/azure-storage-consumer) is a simple example to use the service.

In the application, you can use Azure SDK for Python to operate your storage account (e.g. create your containers, and upload blobs).

1. Get the credentials from the environment variables

  ```
  service_name = 'azure-storage'
  vcap_services = json.loads(os.environ['VCAP_SERVICES'])
  account_name = vcap_services[service_name][0]['credentials']['storage_account_name']
  account_key = vcap_services[service_name][0]['credentials']['primary_access_key']
  ```

2. Create the storage service using the credentials

  ```
  from azure.storage import BlobService
  blob_service = BlobService(account_name, account_key)
  ```

  If you would like to create a blob service in Azure China Cloud, you need to specify `host_base` in `BlobService`.

>**NOTE:** The demo is based on `azure==0.11.1`. If you would like to use the lastest `azure-storage-python`, please refer to [azure-storage-python](https://github.com/Azure/azure-storage-python).

### Binding

1. Build the demo application

  ```
  git clone https://github.com/bingosummer/azure-storage-consumer
  cd azure-storage-consumer
  cf push --no-start
  ```

2. Bind the service instance to the application

  ```
  cf bind-service azure-storage-consumer mystorageservice
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
  cf unbind-service azure-storage-consumer mystorageservice
  ```

2. Delete the service instance

  ```
  cf delete-service mystorageservice -f
  ```
