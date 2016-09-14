# Generate a PCF Tile
1. Check out the tile-generator repo:

  ```
  git clone https://github.com/cf-platform-eng/tile-generator
  ```

1. Change to the root directory of the tile generator, and pull down the generator's dependencies
  ```
  cd tile-generator
  sudo pip install -r requirements.txt
  ```

1. Add the bin directory of tile-generator to your path:

  ```
  export PATH=`pwd`/bin:$PATH
  ```

  Note:
    If you expect to frequently use the tile generator, you may want to add this to your shell's startup script, i.e. .profile

1. Install the [BOSH CLI](https://bosh.io/docs/bosh-cli.html)

1. Under the folder `pcf-tile`, execute below command.

  ```
  ./generate-tile.sh
  ```

  Note:
    * Build a major version: ./generate-tile.sh -major
    * Build a minor version: ./generate-tile.sh -minor
    * Build a patch version: ./generate-tile.sh

1. You can find meta-azure-service-broker-`VERSION`.pivotal under the folder `product`.
