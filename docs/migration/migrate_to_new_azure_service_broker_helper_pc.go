package main

import (
	"fmt"
	"os"
	"time"

	"github.com/Azure/azure-service-broker/pkg/crypto/aes256"
	"github.com/Azure/azure-service-broker/pkg/service"
	"github.com/go-redis/redis"
)

func main() {
	instanceID := os.Args[1]
	serviceID := os.Args[2]
	planID := os.Args[3]
	rg := os.Args[4]
  pc := os.Args[5]
	aeskey := []byte(os.Args[8])

	codec, err := aes256.NewCodec(aeskey)
	if err != nil {
    fmt.Fprintln(os.Stderr, err.Error())
		return
	}
	epc, err := codec.Encrypt([]byte(pc))
	if err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		return
	}

	instance := &service.Instance{
		InstanceID: instanceID,
		ServiceID:  serviceID,
		PlanID:     planID,
		Status:     service.InstanceStateProvisioned,
		Created:    time.Now(),
    StandardProvisioningContext: service.StandardProvisioningContext{
      ResourceGroup: rg,
    },
		EncryptedProvisioningContext: epc,
	}
	json, err := instance.ToJSON()
	if err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		return
	}

	client := redis.NewClient(&redis.Options{
		Addr:     os.Args[6],
		Password: os.Args[7],
		DB:       0,
	})
	if err := client.Set(instance.InstanceID, json, 0).Err(); err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		return
	}

}
