# This is the image that runs a given service.
# Note that both the 'main-*' service to run and the port/key to use 
# are ENV vars that will be changed at 'docker run' time

# Use "base" image with all its requirements already installed
FROM socialcap/protocol:base

# this are default values, BUT will be changed on 'docker run'
ENV KEY=no-key
ENV MAIN=no-main

# run it
WORKDIR /protocol
CMD node --experimental-modules build/src/$MAIN.js $KEY
