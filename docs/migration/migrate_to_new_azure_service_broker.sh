#!/usr/bin/env bash

npm install mssql@3.1.2
npm install js-yaml@3.1.0
npm install request@2.72.0
npm install async@1.5.2

node migrate_to_new_azure_service_broker.js $1 $2 $3