#
# The "base" docker image used by all other docker instances
#

# For more information, please refer to https://aka.ms/vscode-docker-python
FROM ubuntu:22.04

RUN apt-get update
RUN apt -y upgrade 
RUN apt install -y curl

RUN curl -sL https://deb.nodesource.com/setup_20.x > install-node.sh
RUN sh install-node.sh
RUN apt install -y nodejs

# Install the App
WORKDIR /protocol
COPY ./ /protocol
COPY ./.env /protocol/.env

RUN cd /protocol
RUN npm i 

RUN npm run build

# we do not start any process here
