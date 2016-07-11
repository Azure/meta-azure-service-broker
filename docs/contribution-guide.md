# Contribution Guidance

## Overview

Meta Azure Service Broker implements [Service Broker API](http://docs.cloudfoundry.org/services/api.html). Each services module will provision/deprovision/bind/unbind the service instance accordingly.

If you want to support a new service in Meta Azure Service Broker, you need to implement the following things:

1. A new service module
2. Add the test cases and make sure that they can pass.
3. Write a document to describe how to manage the service.

## Service Modules

Create a new directory under the directory `lib/services/`. The new directory name is recommended to be the service name. Please see [the detailed designs](./service-module-design.md) for more informations.

## Test

After you finish the codes for the service operations, you need to implement the test cases. The test cases include two parts: unit tests and integration tests.

### Unit Tests

1. Create a new directory under the directory `test/unit/services/`. The new directory name should be the service name.
2. Implement the test cases in `test/unit/services/<service-name>`.
3. Add the case file name in `test/unittestlist.txt`.

### Integration Tests

Add the new cases in `test/integration/test-matrix.js`.

### Test the Broker Locally

Please see [Test the Broker Locally](../test/) for more informations.

### Run the test via Travis CI

After you test the broker locally, you can submit a PR. Travis CI will test your PR automatically to ensure the quality.
