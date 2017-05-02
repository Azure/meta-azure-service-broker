BASE_NAME     = meta-azure-service-broker
VERSION      ?= $(shell git describe --always --abbrev=7 --dirty)
MUTABLE_TAG  ?= canary
IMAGE         = $(REGISTRY)$(BASE_NAME):$(VERSION)
MUTABLE_IMAGE = $(REGISTRY)$(BASE_NAME):$(MUTABLE_TAG)

docker-build:
	docker build -t $(IMAGE) .
	docker tag $(IMAGE) $(MUTABLE_IMAGE)

docker-push: docker-build
	docker push $(IMAGE)
	docker push $(MUTABLE_IMAGE)
