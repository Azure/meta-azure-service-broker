#!/usr/bin/env bash

npm install mssql@3.1.2
npm install js-yaml@3.10.0
npm install request@2.72.0
npm install async@1.5.2

go get "github.com/go-redis/redis"
go get -u "github.com/Azure/open-service-broker-azure/pkg/crypto/aes256"
go get -u "github.com/Azure/open-service-broker-azure/pkg/service"

node migrate_to_new_azure_service_broker.js $1 $2 $3
