# Meta Azure Service Broker

[![Build Status](https://api.travis-ci.org/Azure/meta-azure-service-broker.svg?branch=master)](https://travis-ci.org/Azure/meta-azure-service-broker)

[Cloud Foundry on Azure is generally available.](https://azure.microsoft.com/en-us/blog/general-availability-of-cloud-foundry-and-preview-access-of-pivotal-cloud-foundry/) If you want to try it, please follow [the guidance](https://github.com/cloudfoundry-incubator/bosh-azure-cpi-release/blob/master/docs/guidance.md).

## Overview

You need an Azure account. With the account, you need to prepare a service principal and SQL Database on Azure which will be used in the deployment of the service broker. For the service offerings and plans, please refer to each specific service.

## How to deploy and use

* [How Cloud Foundry Admin deploy the meta Azure service broker](docs/how-admin-deploy-the-broker.md)

## The provided services

* [Azure Storage Blob Service](./docs/azure-storage-blob.md)
* [Azure Redis Cache Service](./docs/azure-redis-cache.md)
* [Azure DocumentDB Service](./docs/azure-document-db.md)
* [Azure Service Bus and Event Hub Service](./docs/azure-service-bus.md)

## Contribute

* If you would like to become an active contributor to this project please follow the [contribution guidelines](docs/contribution-guide.md).

## More information

[Custom Services in Cloud Foundry](http://docs.cloudfoundry.org/services/)

