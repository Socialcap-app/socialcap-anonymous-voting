#!/bin/bash
echo "\nRestoring pre-voting KVS"
cp -v test/kvs-pre-voting-snapshot/*.mdb ./kvstorage

./run-voting.sh