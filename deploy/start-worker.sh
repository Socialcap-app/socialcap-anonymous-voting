#!/bin/sh
if [ -z "$1" ]; then
    echo "Error: No branch provided."
    echo "Usage: $0 main $ID"
    echo "   or: $0 dev $ID"
    exit 1
fi

if [ -z "$2" ]; then
    echo "Error: No Worker ID provided."
    echo "Usage: $0 main $ID"
    echo "   or: $0 dev $ID"
    exit 1
fi

export WID=$2

#export SOCIALCAP_HOME=socialcap-$1

# will run the Socialcap Worker with NO port
sudo docker rm $(sudo docker stop sc-worker)
sudo docker -l debug run -d --restart=always --name sc-worker-$WID \
  --net=host \
  --env MAIN=main-workers \
  --env KEY=$WID \
  --user $(id -u www-data):$(id -g www-data) \
  -v /etc/localtime:/etc/localtime:ro \
  -v $HOME/var:/var \
  socialcap/protocol:run
