/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');
const {Web3} = require('web3');

// class AssetTransfer extends Contract {

//     async InitLedger(ctx) {
//         const assets = [
//             {
//                 ID: 'asset1',
//                 Color: 'blue',
//                 Size: 5,
//                 Owner: 'Tomoko',
//                 AppraisedValue: 300,
//             },
//             {
//                 ID: 'asset2',
//                 Color: 'red',
//                 Size: 5,
//                 Owner: 'Brad',
//                 AppraisedValue: 400,
//             },
//             {
//                 ID: 'asset3',
//                 Color: 'green',
//                 Size: 10,
//                 Owner: 'Jin Soo',
//                 AppraisedValue: 500,
//             },
//             {
//                 ID: 'asset4',
//                 Color: 'yellow',
//                 Size: 10,
//                 Owner: 'Max',
//                 AppraisedValue: 600,
//             },
//             {
//                 ID: 'asset5',
//                 Color: 'black',
//                 Size: 15,
//                 Owner: 'Adriana',
//                 AppraisedValue: 700,
//             },
//             {
//                 ID: 'asset6',
//                 Color: 'white',
//                 Size: 15,
//                 Owner: 'Michel',
//                 AppraisedValue: 800,
//             },
//         ];

//         for (const asset of assets) {
//             asset.docType = 'asset';
//             await ctx.stub.putState(asset.ID, Buffer.from(JSON.stringify(asset)));
//             console.info(`Asset ${asset.ID} initialized`);
//         }
//     }

//     // CreateAsset issues a new asset to the world state with given details.
//     async CreateAsset(ctx, id, color, size, owner, appraisedValue) {
//         const asset = {
//             ID: id,
//             Color: color,
//             Size: size,
//             Owner: owner,
//             AppraisedValue: appraisedValue,
//         };
//         ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
//         return JSON.stringify(asset);
//     }

//     // ReadAsset returns the asset stored in the world state with given id.
//     async ReadAsset(ctx, id) {
//         const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
//         if (!assetJSON || assetJSON.length === 0) {
//             throw new Error(`The asset ${id} does not exist`);
//         }
//         return assetJSON.toString();
//     }

//     // UpdateAsset updates an existing asset in the world state with provided parameters.
//     async UpdateAsset(ctx, id, color, size, owner, appraisedValue) {
//         const exists = await this.AssetExists(ctx, id);
//         if (!exists) {
//             throw new Error(`The asset ${id} does not exist`);
//         }

//         // overwriting original asset with new asset
//         const updatedAsset = {
//             ID: id,
//             Color: color,
//             Size: size,
//             Owner: owner,
//             AppraisedValue: appraisedValue,
//         };
//         return ctx.stub.putState(id, Buffer.from(JSON.stringify(updatedAsset)));
//     }

//     // DeleteAsset deletes an given asset from the world state.
//     async DeleteAsset(ctx, id) {
//         const exists = await this.AssetExists(ctx, id);
//         if (!exists) {
//             throw new Error(`The asset ${id} does not exist`);
//         }
//         return ctx.stub.deleteState(id);
//     }

//     // AssetExists returns true when asset with given ID exists in world state.
//     async AssetExists(ctx, id) {
//         const assetJSON = await ctx.stub.getState(id);
//         return assetJSON && assetJSON.length > 0;
//     }

//     // TransferAsset updates the owner field of asset with given id in the world state.
//     async TransferAsset(ctx, id, newOwner) {
//         const assetString = await this.ReadAsset(ctx, id);
//         const asset = JSON.parse(assetString);
//         asset.Owner = newOwner;
//         return ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
//     }

//     // GetAllAssets returns all assets found in the world state.
//     async GetAllAssets(ctx) {
//         const allResults = [];
//         // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
//         const iterator = await ctx.stub.getStateByRange('', '');
//         let result = await iterator.next();
//         while (!result.done) {
//             const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
//             let record;
//             try {
//                 record = JSON.parse(strValue);
//             } catch (err) {
//                 console.log(err);
//                 record = strValue;
//             }
//             allResults.push({ Key: result.value.key, Record: record });
//             result = await iterator.next();
//         }
//         return JSON.stringify(allResults);
//     }


// }

// module.exports = AssetTransfer;


class AssetTransfer extends Contract {

    // Existing function to initialize ledger with sample assets
    async initLedger(ctx) {
        console.info('Chaincode has been initialized');
    }

    // Existing function to transfer assets
    async transferAsset(ctx, assetID, newOwner) {
        const assetAsBytes = await ctx.stub.getState(assetID);

        if (!assetAsBytes || assetAsBytes.length === 0) {
            throw new Error(`${assetID} does not exist`);
        }
        const asset = JSON.parse(assetAsBytes.toString());
        asset.owner = newOwner;

        await ctx.stub.putState(assetID, Buffer.from(JSON.stringify(asset)));
        console.info(`Asset with ID ${assetID} transferred to ${newOwner}`);
    }

    
    // async storeData(ctx, id, jsonData) {
    //     // Parse the incoming data to JSON if it's in string format
    //     const data = {
    //         id,
    //         jsonData: JSON.parse(jsonData),  // Store the JSON data as an object
    //     };

    //     // Store the data on the ledger using the ID as the key
    //     await ctx.stub.putState(id, Buffer.from(JSON.stringify(data)));
    //     console.info(`Data with ID ${id} stored successfully`);
    // }

    async storeData(ctx, jsonData) {
        try {
            // Get the last used ID from the ledger
            const lastIdAsBytes = await ctx.stub.getState('last_id');
            let lastId = lastIdAsBytes.length > 0 ? parseInt(lastIdAsBytes.toString()) : 0;

            // Increment the ID for the new data
            const newId = lastId + 1;

            // Check if the data already exists with the generated ID
            const exists = await this.dataExists(ctx, newId.toString());
            if (exists) {
                throw new Error(`Data with ID ${newId} already exists`);
            }

            // Create a new DataEntry object with the generated ID
            const dataEntry = {
                id: newId.toString(),
                jsonData: JSON.parse(jsonData),
            };

            // Store the new data in the blockchain with the generated ID
            await ctx.stub.putState(newId.toString(), Buffer.from(JSON.stringify(dataEntry)));

            // Update the last used ID in the ledger
            await ctx.stub.putState('last_id', Buffer.from(newId.toString()));

            return { message: `Data with ID ${newId} stored successfully in Fabric` };

        } catch (error) {
            console.error('Error storing data:', error);
            throw new Error(`Failed to store data: ${error.message}`);
        }
    }

    async dataExists(ctx, id) {
        const dataAsBytes = await ctx.stub.getState(id);
        return dataAsBytes && dataAsBytes.length > 0;
    }

    // Function to fetch data by ID
    async getData(ctx, id) {
        const dataAsBytes = await ctx.stub.getState(id);
        if (!dataAsBytes || dataAsBytes.length === 0) {
            throw new Error(`Data with ID ${id} does not exist`);
        }
        return dataAsBytes.toString();
    }

    // List all stored data IDs
    async getAllData(ctx) {
        const iterator = await ctx.stub.getStateByRange('', '');
        const allResults = [];
        while (true) {
            const res = await iterator.next();
            if (res.value && res.value.value.toString()) {
                allResults.push(res.value.value.toString('utf8'));
            }
            if (res.done) {
                await iterator.close();
                return allResults;
            }
        }
    }
    async callEthereumFunction() {
        // Connect to Ethereum
        const web3 = new Web3('http://host.docker.internal:7545'); // Replace with your Ethereum node's URL

        // Get the contract instances
        const contractABI = [
            {
              "constant": true,
              "inputs": [
                {
                  "name": "",
                  "type": "uint256"
                }
              ],
              "name": "dataStore",
              "outputs": [
                {
                  "name": "id",
                  "type": "uint256"
                },
                {
                  "name": "jsonData",
                  "type": "string"
                }
              ],
              "payable": false,
              "stateMutability": "view",
              "type": "function",
              "signature": "0xda6ea12a"
            },
            {
              "anonymous": false,
              "inputs": [
                {
                  "indexed": true,
                  "name": "id",
                  "type": "uint256"
                },
                {
                  "indexed": false,
                  "name": "jsonData",
                  "type": "string"
                }
              ],
              "name": "DataStored",
              "type": "event",
              "signature": "0x56ae0cf797dc5c06b48e3f1f0ac14db02bbbeff12a70e489e5a2403ffc021bb8"
            },
            {
              "constant": false,
              "inputs": [
                {
                  "name": "jsonData",
                  "type": "string"
                }
              ],
              "name": "storeData",
              "outputs": [],
              "payable": false,
              "stateMutability": "nonpayable",
              "type": "function",
              "signature": "0xfb218f5f"
            },
            {
              "constant": true,
              "inputs": [
                {
                  "name": "id",
                  "type": "uint256"
                }
              ],
              "name": "getData",
              "outputs": [
                {
                  "name": "",
                  "type": "string"
                }
              ],
              "payable": false,
              "stateMutability": "view",
              "type": "function",
              "signature": "0x0178fe3f"
            },
            {
              "constant": true,
              "inputs": [],
              "name": "getAllIds",
              "outputs": [
                {
                  "name": "",
                  "type": "uint256[]"
                }
              ],
              "payable": false,
              "stateMutability": "view",
              "type": "function",
              "signature": "0xaaa44e5c"
            }
          ]
        const contractAddress = '0xecd2b2487cDDc93a2427d403c8c7224116B31bfb';  // Replace with your contract address // Replace with your contract address
        const contract = new web3.eth.Contract(contractABI, contractAddress);

        // Call the Ethereum contract function
        //const account = ethAddress; // Ethereum account address
        // const result = await contract.methods[functionName](...args).call({ from: account });
        // console.log(contract); 
         
        try {
            const data = await contract.methods.getData(4).call();
            console.log(`✅ Data from Eth`, JSON.parse(data));
        } catch (error) {
            console.error(`❌ Error fetching data from Eth`, error);
        }

        // Return the result
        // return result;
        return;
    }

    async getDataFromEthById(ctx,id) {
        // Connect to Ethereum
        const web3 = new Web3('http://host.docker.internal:7545'); // Replace with your Ethereum node's URL

        // Get the contract instances
        const contractABI = [
            {
              "constant": true,
              "inputs": [
                {
                  "name": "",
                  "type": "uint256"
                }
              ],
              "name": "dataStore",
              "outputs": [
                {
                  "name": "id",
                  "type": "uint256"
                },
                {
                  "name": "jsonData",
                  "type": "string"
                }
              ],
              "payable": false,
              "stateMutability": "view",
              "type": "function",
              "signature": "0xda6ea12a"
            },
            {
              "anonymous": false,
              "inputs": [
                {
                  "indexed": true,
                  "name": "id",
                  "type": "uint256"
                },
                {
                  "indexed": false,
                  "name": "jsonData",
                  "type": "string"
                }
              ],
              "name": "DataStored",
              "type": "event",
              "signature": "0x56ae0cf797dc5c06b48e3f1f0ac14db02bbbeff12a70e489e5a2403ffc021bb8"
            },
            {
              "constant": false,
              "inputs": [
                {
                  "name": "jsonData",
                  "type": "string"
                }
              ],
              "name": "storeData",
              "outputs": [],
              "payable": false,
              "stateMutability": "nonpayable",
              "type": "function",
              "signature": "0xfb218f5f"
            },
            {
              "constant": true,
              "inputs": [
                {
                  "name": "id",
                  "type": "uint256"
                }
              ],
              "name": "getData",
              "outputs": [
                {
                  "name": "",
                  "type": "string"
                }
              ],
              "payable": false,
              "stateMutability": "view",
              "type": "function",
              "signature": "0x0178fe3f"
            },
            {
              "constant": true,
              "inputs": [],
              "name": "getAllIds",
              "outputs": [
                {
                  "name": "",
                  "type": "uint256[]"
                }
              ],
              "payable": false,
              "stateMutability": "view",
              "type": "function",
              "signature": "0xaaa44e5c"
            }
          ]
        const contractAddress = '0xecd2b2487cDDc93a2427d403c8c7224116B31bfb';  // Replace with your contract address // Replace with your contract address
        const contract = new web3.eth.Contract(contractABI, contractAddress);

        // Call the Ethereum contract function
        //const account = ethAddress; // Ethereum account address
        // const result = await contract.methods[functionName](...args).call({ from: account });
        // console.log(contract); 
         
        const numericId = parseInt(id);
        try {
            const data = await contract.methods.getData(numericId).call();
            console.log(`✅ Data from Eth`, JSON.parse(data));
        } catch (error) {
            console.error(`❌ Error fetching data from Eth`, error);
        }

        // Return the result
        // return result;
        return;
    }
}

module.exports = AssetTransfer;