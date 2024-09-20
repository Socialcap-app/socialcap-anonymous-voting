#!/bin/sh
#
# Builds the docker images but without restarting containers
# Use:
#     ./build-images.sh dev
# or
#     ./build-images.sh main
#
if [ -z "$1" ]; then
    echo "Error: No branch provided."
    echo "Usage: $0 main"
    echo "   or: $0 dev"
    exit 1
fi

export ENV=".env.$1"
cp -f -v $ENV .env

# first build base image
sudo docker build -t socialcap/protocol:base -f ./deploy/base.Dockerfile .

# now build the runners images
sudo docker build -t socialcap/protocol:run -f ./deploy/run.Dockerfile .
