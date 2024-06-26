# The Relayer API

The API is composed of the **messages sent to the Relayer** (some NATS.io server).

There are two main groups of messages:

- **Semaphore messages**: These are messages that implement the basic features of the Semaphore protocol, and are not binded to any particular application.
- **Voting messages**: These are the messages related to the Socialcap voting application protocol.

## Semaphore messages

#### Register identity

#### Remove identity

#### Create group

#### Remove group

## Voting messages

#### Select electors

#### Start election

#### Get tasks

#### Send votes

#### Stop election

#### Aggregate votes

#### Issue credentials

