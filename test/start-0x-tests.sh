#!/bin/bash
echo "\nRestoring KVS"
rm -f ./kvstorage/*.mdb
rm -f test/files/*

echo "\nRun listener"
./run-voting.sh


