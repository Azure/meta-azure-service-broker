# How Cloud Foundry Admin manage the meta Azure service broker

## Deploy the meta Azure service broker as an application in Cloud Foundry

1. Get the source code from Github.

  ```
  git clone https://github.com/Azure/meta-azure-service-broker
  cd meta-azure-service-broker
  ```

2. Update `config/meta-service-broker.json`.

3. Update `manifest.yml` with your credentials.

  ```
  environment: REPLACE-ME
  subscription_id: REPLACE-ME
  tenant_id: REPLACE-ME
  client_id: REPLACE-ME
  client_secret: REPLACE-ME
  ```

  Two options `AzureCloud` and `AzureChinaCloud` are supported for `environment`.

  A [service principal](https://azure.microsoft.com/en-us/documentation/articles/resource-group-create-service-principal-portal/) is composed of `tenant_id`, `client_id` and `client_secret`.

  If you want to enable the document DB service, you need to specify the following values. Please ignore them if you do not want to enable the document DB service.

  ```
  docDb_hostEndPoint: REPLACE-ME
  docDb_masterKey: REPLACE-ME
  ```

4. Push the broker to Cloud Foundry

  ```
  cf push
  ```

## Register a service broker

```
cf create-service-broker demo-service-broker $authUser $authPassword <URL of the app meta-azure-service-broker>
```

`$authUser` and `$authPassword` should be same as the ones in `config/meta-service-broker.json`.

## Make the plans public

```
cf enable-service-access $service-name
```

For example:

```
cf enable-service-access azurestorageblob
```

Show the services in the marketplace to verify they are ready.

```
cf marketplace
```

## Unregister a service broker

```
cf delete-service-broker demo-service-broker -f
```

## More information

[Managing Service Brokers](http://docs.cloudfoundry.org/services/managing-service-brokers.html)
