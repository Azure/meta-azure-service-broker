#!/bin/bash
pushd ..
  zip --exclude=*examples* --exclude=*docs* --exclude=*test* --exclude=*pcf-tile* --exclude=*node_modules* --exclude=README.md  --exclude=manifest.yml -r pcf-tile/resources/meta-azure-service-broker.zip *
popd
if [ "$1" = "-major" ]; then
  tile build major
elif [ "$1" = "-minor" ]; then
  tile build minor
else
  tile build
fi
