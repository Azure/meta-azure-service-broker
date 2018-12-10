#!/bin/bash
pushd ..
  rm -f pcf-tile/resources/meta-azure-service-broker.zip
  zip -r pcf-tile/resources/meta-azure-service-broker.zip brokerserver.js index.ts .npmrc lib LICENSE NOTICE package.json winston.json node_modules
popd
if [ "$1" = "-major" ]; then
  tile build major
elif [ "$1" = "-minor" ]; then
  tile build minor
else
  tile build
fi
