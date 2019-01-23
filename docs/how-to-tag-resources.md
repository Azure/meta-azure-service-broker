# How to add Custom Tags to resources with meta Azure service broker

To add custom tags to any resource created by the Azure service broker, add a "tags" element to the JSON object containing configuration parameters with your provision request.  
Parameters are passed in a valid JSON object containing configuration parameters, provided either in-line or in a file.

  See the service specific [supported configuration parameters](../README.md#the-provided-services) 

  ```
  {
    ...                                              // Service specific parameters elided. 
    "resourceGroup": "<resource-group-name>",        // [Required] Unique. Only allow up to 90 characters
    "location": "<location>",                        // [Required] e.g. eastasia, eastus2, westus, etc. You can use azure cli command 'azure location list' to list all locations.
    "tags":                                          // [Optional] Tags name:value to be added to resource at provision time.
    {
        "<name>": "<value>",
        "<name2>": "<value2>"
    }
  }
  ```
  For example:

  ```
  cf create-service azure-documentdb standard mydocdb -c examples/documentdb-example-config.json
  ```

  The contents of `examples/documentdb-example-config.json`:

  ```
  {
    "resourceGroup": "azure-service-broker",
    "docDbAccountName": "generated-string",
    "docDbName": "generated-string",
    "location": "eastus",
    "tags":
    {
        "Dept": "IT",
        "Environment": "Test"
    }
  }
  ```
