# Migrate to Open Service Broker for Azure

This is a guidance how to migrate meta-azure-service-broker(MASB) to [open-service-broker-azure](https://github.com/Azure/open-service-broker-azure)(OSBA).

## Prerequisites

* The Azure environment of MASB is public Azure (as OSBA only supports public Azure currently). 

* The MASB version in using is equal or greater than 1.4.0.

* There is no existing instance for the services listed:
  * azure-mysqldb
  * azure-postgresqldb
  * azure-cosmosdb
  * azure-documentdb

* Have NodeJS 6 or greater installed. Have NPM 3.x installed.

* Have Golang 1.8.3 installed.

## Migration Steps

### 1. If you have azure-sqldb instances which are not on an existing server, prepare a list of their instance GUIDs.

With the format in a plain text file:

```
d008a572-1ded-45b0-a2fe-4bb0fdedb645
325aedac-c2c3-47f4-a8fa-0b6dc343f94f
6641fdfb-abef-4303-ad29-f055c1ca66cc
```

>>Tip: The CF CLI command `cf service <instance-name> --guid` can check the GUID of a service instance.

For the azure-sqldb instances without the list, the migration script will treat them as existing server case.

### 2. Purge services offering via CF CLI

As above listed services are not able to migrate. We need to purge them via CF CLI. run:

```
$ cf purge-service-offering azure-mysqldb -f
$ cf purge-service-offering azure-postgresqldb -f
$ cf purge-service-offering azure-cosmosdb -f
$ cf purge-service-offering azure-documentdb -f
```

>>**WARNING**: `cf purge-service-offering SERVICE` assumes that the service broker responsible for this service offering is no longer available, and all service instances have been deleted. The resources of these instances are still on Azure. You can manually migrate them.

### 3. Install Open Service Broker for Azure

Follow the [doc](https://github.com/Azure/open-service-broker-azure/tree/master/contrib/cf) to install OSBA.

### 4. Migrate service instances records from MASB database(the SQL one) to OSBA database(the redis one).

1. Download migration scripts:

```
curl -L -O https://raw.githubusercontent.com/Azure/meta-azure-service-broker/master/docs/migration/migrate_to_new_azure_service_broker.sh
curl -L -O https://raw.githubusercontent.com/Azure/meta-azure-service-broker/master/docs/migration/migrate_to_new_azure_service_broker.js
curl -L -O https://raw.githubusercontent.com/Azure/meta-azure-service-broker/master/docs/migration/migrate_to_new_azure_service_broker_helper_pc.go
curl -L -O https://raw.githubusercontent.com/Azure/meta-azure-service-broker/master/docs/migration/migrate_to_new_azure_service_broker_helper_bc.go
```

2. Get the `manifest.yml`(filled for `cf push`) of both MASB and OSBA.

3. Run:

```
$ chmod +x migrate_to_new_azure_service_broker.sh
$ ./migrate_to_new_azure_service_broker.sh <path-to-masb-manifest> <path-to-osba-manifest> (<path-to-new-sql-server-list>)
```

The broker database migration succeeds if the script ends with no error message.

### 4. Update service broker via CF CLI

Run:

```
$ cf update-service-broker <service-broker-name> <admin-to-new-broker> <password-to-new-broker> <url-to-new-broker>
```

The `<service-broker-name>` can be checked by `cf service-brokers` if you forget which name meta-azure-service-broker was registered with.

## Notes (IMPORTANT)

* The bound apps possiblely need some code changes, as the format of credentials delivered by the broker have some changes. Please refer to [open-service-broker-azure docs](https://github.com/Azure/open-service-broker-azure/tree/master/docs/modules) and [meta-azure-service-broker docs](https://github.com/Azure/meta-azure-service-broker/tree/master/docs) to see the differences module-by-module in detail. Note that the credentials just change in new bindings. Credentials in existing bindings won't change.

* The provisioning parameters changes. If you use script to provide provisioning parameters for new service instance creation, remember to update it.

## Troubleshooting

* If you hit `invalid_client` issue, `tenant` issue, or `subscription` issue:

  Please check following credentials in the MASB manifest:
    * SUBSCRIPTION_ID
    * TENANT_ID
    * CLIENT_ID
    * CLIENT_SECRET
  
* If you hit `Broken instance record` issue:
  
  Please check if the record is valid in MASB database by running `select * from instances where instanceID='<instanceID>'`. Delete it and retry if it is invalid.

* If you hit `Broken binding record` issue:
  
  Please check if the record is valid in MASB database by running `select * from bindings where bindingID='<bindingID>'`. Delete it and retry if it is invalid.