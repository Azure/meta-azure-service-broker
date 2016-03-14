# Azure Storage Blob Service

[Azure Storage Service](https://azure.microsoft.com/en-us/services/storage/) offers reliable, economical cloud storage for data big and small. This broker currently publishes a single service and plan for provisioning Azure Storage Service.

## Creation and Naming of Azure Resources

A service provisioning call will create Azure Storage Account.

The following names are used and can be customized with a prefix:

Resource         | Name is based on     | Custom Prefix Environment Variable  | Default Prefix    | Example Name  
-----------------|----------------------|-------------------------------------|-------------------|---------------
Azure Storage Account | part of service instance ID | STORAGE_ACCOUNT_NAME_PREFIX | cf | cf2eac2d52bfc94d0faf28c0
Azure Storage Containers | service instance ID | CONTAINER_NAME_PREFIX | cloud-foundry- | cloud-foundry-2eac2d52-bfc9-4d0f-af28-c02187689d72

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

For Python applications, you may consider using [Azure Storage Consumer](https://github.com/bingosummer/azure-storage-consumer).

In the application, you ou can use Azure SDK to operate your storage account, for e.g. put or get your blobs.

```
from azure.storage import BlobService
account_name = vcap_services[service_name][0]['credentials']['storage_account_name']
account_key = vcap_services[service_name][0]['credentials']['primary_access_key']
blob_service = BlobService(account_name, account_key)
```
