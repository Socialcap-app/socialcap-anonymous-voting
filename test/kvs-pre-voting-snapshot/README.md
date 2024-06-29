# KVS pre-voting-snapshot

This is a KVS snapshot with all the needed data to run voting tests.

After running the tests the KVS data will be modified and we will not be able to run the test again, as nullifiers will mark votes as repeated.

So we need to restore this snapshot (copy *.mdb files to ./kvstorage) BEFORE we can run the tests.

**Usage**

Move to the project root: 
~~~
cd ~/dev/socialcap/anonymous-voting
~~~

Use (from project root):
~~~
sh test/restore-pre-voting-snapshot.sh
~~~
