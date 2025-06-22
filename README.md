# Federated_Blockchain_Network

This repository aims at interoperability between two blockchains network, one being public (ethereum) and other being private permissioned blockchain(Hyperledger fabric). 

## Ethereum
Refer to the video - https://www.youtube.com/watch?v=coQ5dg8wM2o , to setup the Ethereum application, ganache , Metamask and all the underlying depedencies.

Once you are done writing your custom contract, use the command <br>```truffle compile``` , to compile the smart contract. <br>```truffle migrate``` to deploy the contract .
<br>```truffle migrate --reset``` if the contract has already been deployed and you want to re-deploy it.

## Hyperledger Fabric
You can clone the hyperledger fabric git repo from here -> https://github.com/hyperledger/fabric-samples <br>
The code in this repository under fabric-samples, contains part of the code that has been changed/modified.
Refer to this to understand how to run a test network in fabric - https://hyperledger-fabric.readthedocs.io/fa/latest/test_network.html <br>

Once the channel is up and running, run registerEnrollUser.js , so that the user can be enrolled under the CA (this step needs to be done everytime the network is brought up). To run this file, simply in the root directory, do: <br>
```node registerEnrollUser.js```
