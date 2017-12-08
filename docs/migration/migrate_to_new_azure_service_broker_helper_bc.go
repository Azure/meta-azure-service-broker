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
  bindingID := os.Args[1]
	instanceID := os.Args[2]
	bc := os.Args[3]
	aeskey := []byte(os.Args[6])

	codec, err := aes256.NewCodec(aeskey)
	if err != nil {
    fmt.Fprintln(os.Stderr, err.Error())
		return
	}
	ebc, err := codec.Encrypt([]byte(bc))
	if err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		return
	}

	binding := &service.Binding{
    BindingID: bindingID,
		InstanceID: instanceID,
		Status:     service.BindingStateBound,
		Created:    time.Now(),
		EncryptedBindingContext: ebc,
	}
	json, err := binding.ToJSON()
	if err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		return
	}

  redisOpts := &redis.Options{
		Addr:       os.Args[4],
		Password:   os.Args[5],
		DB:         0,
		MaxRetries: 5,
	}
	if strings.HasSuffix(os.Args[4], "6380") {
		redisOpts.TLSConfig = &tls.Config{
			ServerName: os.Args[4][:len(os.Args[4])-5],
		}
	}

	client := redis.NewClient(redisOpts)
	if err := client.Set(binding.BindingID, json, 0).Err(); err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		return
	}

}
