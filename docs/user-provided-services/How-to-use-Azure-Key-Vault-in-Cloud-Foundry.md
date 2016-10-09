# How to use Azure Key Vault in Cloud Foundry

## Prerequisites

### 1. You have created AAD(Azure Active Directory), Key Vault, and keys(or secrets) in the Key Vault

  The documents below show how to create them in different ways: 
 
  * [Create and Manage Key Vaults with REST](https://msdn.microsoft.com/library/azure/mt620024.aspx)
  * [Create and Manage Key Vaults with PowerShell](https://azure.microsoft.com/en-us/documentation/articles/key-vault-get-started/)
  * [Create and Manage Key Vaults with CLI](https://azure.microsoft.com/en-us/documentation/articles/key-vault-manage-with-cli/)
  
  >**NOTE:** Make sure you've authorized your application (by **client id** of the service principal) to use the key or secret. 
  Please reference [Authorize the application to use the key or secret](https://azure.microsoft.com/en-us/documentation/articles/key-vault-get-started/#authorize). 


  
### 2. Your application reads credentials of Key Vault from environment variables

  [Here](https://azure.microsoft.com/en-us/downloads) 
  are some tools you may want to use to develop your application. 
  You could investigate which credentials they need to manage the key vault.
  
  e.g. [Using REST API to encrypt some texts with a key](https://msdn.microsoft.com/en-us/library/azure/dn878060.aspx), 
  **client id**, **client secret**, **key vault name**, and **key name** are needed.
  
  e.g. [Using NodeJS SDK to retrieve a secret](http://azure.github.io/azure-sdk-for-node/azure-keyvault/latest/), 
  **client id**, **client secret**, **key vault uri**, and **secret id** are needed.

## Deliver Credentials of Key Vault to an Application

  User-provided service instances enable developers to configure their applications with custom environment variables 
  using the familiar [Application Binding](https://docs.cloudfoundry.org/devguide/services/application-binding.html) 
  operation and the same application runtime environment variable used by Cloud Foundry to automatically deliver credentials 
  for marketplace services ([VCAP_SERVICES](https://docs.cloudfoundry.org/devguide/deploy-apps/environment-variable.html)).
  
### 1. Create a User-provided service instance
  
  Use following command in Cloud Foundry dev-box to create a user-provided service instance.

  ```
  cf cups MY_SERVICE_INSTANCE -p '{"clientId":"<my-client-id>","clientSecret":"<my-client-secret>","vaultUri":"https://<my-vault-name>.vault.azure.net","kid1":"<my-kid1>","kid2":"<my-kid2>"}'
  ```

  >**NOTE:** The vault uri format is for global azure.
  * Uri for Azure China Cloud: https://<my-vault-name>.vault.azure.cn

  To create a service instance in interactive mode, use the -p option with a comma-separated list of parameter names. The cf CLI will prompt you for each parameter value.

  ```
  cf cups SERVICE_INSTANCE -p "clientId, clientSecret, vaultUri, kid1, kid2"
  ```

  
### 2. Bind the service instance to your application

  Use following command in Cloud Foundry dev-box to bind the service instance to your app.

  ```
  cf bind-service MY_APP MY_SERVICE_INSTANCE
  ```

  Then, the credential parameters are put in the app's environment variables. You can check them by using:

  ```
  cf env MY_APP
  ```
  
  See more details about binding a service instance [HERE](https://docs.cloudfoundry.org/devguide/services/application-binding.html).


---

After above steps, your application can read credentials like clientId and vaultUri from environment variables to manage your Key Vault!

Visit [HERE](https://azure.microsoft.com/en-us/documentation/services/key-vault/) for more Key Vault documents.