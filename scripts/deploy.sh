set -o errexit
set -o nounset
set -o pipefail

export REGISTRY=microsoft/

docker login -u "${DOCKER_USERNAME}" -p "${DOCKER_PASSWORD}"

if [[ -n "${TRAVIS_TAG}" ]]; then
    echo "Pushing images with tag ${TRAVIS_TAG}."
    VERSION="${TRAVIS_TAG}" make docker-push
elif [[ "${TRAVIS_PULL_REQUEST}" == "false" && "${TRAVIS_BRANCH}" == "master" ]]; then
    echo "Pushing images with sha tag."
    make make docker-push
fi
