package main

import (
  "crypto/tls"
	"fmt"
	"os"
  "strings"
	"time"

	"github.com/Azure/open-service-broker-azure/pkg/crypto/aes256"
	"github.com/Azure/open-service-broker-azure/pkg/service"
	"github.com/go-redis/redis"
)

func main() {
	instanceID := os.Args[1]
	serviceID := os.Args[2]
	planID := os.Args[3]
	rg := os.Args[4]
  location := os.Args[5]
  pc := os.Args[6]
	aeskey := []byte(os.Args[9])

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
      Location: location,
    },
		EncryptedProvisioningContext: epc,
	}
	json, err := instance.ToJSON()
	if err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		return
	}

  redisOpts := &redis.Options{
		Addr:       os.Args[7],
		Password:   os.Args[8],
		DB:         0,
		MaxRetries: 5,
	}
	if strings.HasSuffix(os.Args[7], "6380") {
		redisOpts.TLSConfig = &tls.Config{
			ServerName: os.Args[7][:len(os.Args[7])-5],
		}
	}
  
	client := redis.NewClient(redisOpts)
	if err := client.Set(instance.InstanceID, json, 0).Err(); err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		return
	}

}
