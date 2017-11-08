# Migrate from <1.4.0 to >=1.4.0

This is a guidance to fix https://github.com/Azure/meta-azure-service-broker/issues/154.

## Prerequisites

* [Install NodeJS](https://nodejs.org/en/download/package-manager/).

* [Install NPM](https://www.npmjs.com/get-npm?utm_source=house&utm_medium=homepage&utm_campaign=free%20orgs&utm_term=Install%20npm).

* Install node module `mssql@3.1.2`. (`npm install mssql@3.1.2`)

* Install node module `js-yaml@3.1.0`. (`npm install js-yaml@3.1.0`)

* [Download migration script](https://github.com/Azure/meta-azure-service-broker/blob/master/docs/migration/1.2.1_to_1.3.0_or_greater.js).

## Migrate

Run

```
node lower_1.4.0_to_1.4.0_or_greater.js manifest.yml
```

**NOTE**: It is just your manifest.yml with filled `AZURE_BROKER_DATABASE_SERVER`, `AZURE_BROKER_DATABASE_USER`, `AZURE_BROKER_DATABASE_PASSWORD`, `AZURE_BROKER_DATABASE_NAME`, and `AZURE_BROKER_DATABASE_ENCRYPTION_KEY`. Filling them in a blank [manifest.yml](https://github.com/Azure/meta-azure-service-broker/blob/master/manifest.yml) to use is OK, too.
