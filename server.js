const express = require("express");
const axios = require("axios");
const {Web3} = require('web3');
const app = express();
const csvParser = require('csv-parser');
const xml2js = require('xml2js');
const YAML = require('yamljs');
require('dotenv').config();
const fs = require('fs');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs2 = require('fs');
const FabricCAServices = require('fabric-ca-client');
const bodyParser = require('body-parser');  
const { Readable } = require('stream');
const msgpack = require('@msgpack/msgpack');
const cbor = require('cbor');
const protobuf = require('protobufjs');
const getRawBody = require('raw-body');
const { decodeMulti } = require('@msgpack/msgpack');
const { decode } = require('@msgpack/msgpack');


// app.use(express.json());
app.use(bodyParser.text({ type: ['application/xml', 'text/xml'] }));
app.use(bodyParser.text({ type: ['text/csv'] })); 
// CSV support


const web3 = new Web3('http://localhost:7545'); 
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
const contractAddress = '0xecd2b2487cDDc93a2427d403c8c7224116B31bfb'; 
const contractInstance = new web3.eth.Contract(contractABI, contractAddress);
const senderAccount = '0x0738b5E69eBC3BD7Bf1fe5c9534bf5F3facA7127'; 


//Hyperledger Fabric
const channelName = 'mychannel'; // Channel name
const chaincodeName = 'basic'; // Chaincode name
const port = 3000;


// Path to connection profile
const ccpPath = path.resolve(__dirname,'fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json');

// Wallet path for identity management
const walletPath = path.join(process.cwd(), 'wallet'); // Define the wallet location



// Check if the contract instance is initialized correctly
if (!contractInstance || !contractInstance.events) {
  console.error("❌ Contract instance is not initialized properly.");
} else {
  console.log("✅ Contract initialized successfully.");
}

// Standardize data
function standardizeData(data) {
    // Initialize the standardized result object
    const standardized = {};
  
    Object.keys(data).forEach((key) => {
      standardized[key] = data[key];
    });
  
    // Add additional standardized fields if required (e.g., timestamp or source)
    standardized.timestamp = data.processedTimestamp || new Date().toISOString();  // Use the timestamp from the data or the current timestamp
    //standardized.computedResult = data.result || "No computed result";  // Set a default value if no result field exists
  
    return standardized;
  }

// Endpoint to accept processed data from HPC
app.post("/store-datas", async (req, res) => {
  const processedData = req.body;

  console.log("Received processed data:", processedData);

  try {
    // Standardize the data
    const standardizedData = standardizeData(processedData);

    console.log("Standardized data:", standardizedData);

    // Forward data to Ethereum or Hyperledger Fabric
    // Example: Sending to Ethereum via Web3
    await sendToEthereum(standardizedData);

    // Example: Storing to Hyperledger Fabric
    await sendToFabric(standardizedData);

    res.status(200).json({
      message: "Data stored successfully",
    });
  } catch (error) {
    console.error("Error storing data:", error);
    res.status(500).json({ message: "Error storing data", error });
  }
});


async function storeDataToETH(jsonData)
{
  try {
    // Convert JSON object to a string
    // const jsonData = await convertToJson(data);
    const jsonString = JSON.stringify(jsonData);
    console.log("JSON string, ", jsonString)
    // Send transaction to Ethereum contract
    const receipt = await contractInstance.methods.storeData(jsonString)
        .send({ from: senderAccount, gas: 500000 });

    console.log(`✅ JSON data stored on Ethereum (Tx Hash: ${receipt.transactionHash})`);
} catch (error) {
    console.error(`❌ Error storing JSON data: ${error}`);
}
}

// Function to listen for Ethereum events
async function getAllIds() {
contractInstance.methods.getAllIds().call().then(ids => {
  console.log(ids); 
});
}

async function fetchDataById(id) {
  try {
      const data = await contractInstance.methods.getData(id).call();
    //   console.log(`✅ Data for ID ${id}:`, JSON.parse(data));
    console.log(`Data for ID ${id} :`,JSON.stringify(data, null, 2));
    // console.log(`Data for ID ${id} :`,JSON.parse(data.toString()));
  } catch (error) {
      console.error(`❌ Error fetching data for ID ${id}:`, error);
  }
}

async function fetchAllDataFromEth() {
  try {
      // Get all stored IDs
      const ids = await contractInstance.methods.getAllIds().call();
    //   console.log(`✅ Found ${ids.length} records in Ethereum`);

      let allData = [];
      for (let id of ids) {
          const jsonData = await contractInstance.methods.getData(id).call();
          allData.push({ id, jsonData: JSON.parse(jsonData) });
      }

      console.log("✅ All Data:", allData);
      return allData;
  } catch (error) {
      console.error("❌ Error fetching all data:", error);
  }
}

async function sendToEthereum(data) {
  console.log("Sending to Ethereum:", data);
  
}

// Simulate sending data to Hyperledger Fabric
async function sendToFabric(data) {
  console.log("Sending to Hyperledger Fabric:", data);
  
}

// Start the middleware server
// const PORT = 3002;
// app.listen(PORT, () => {
//   console.log(`Middleware server running on port ${PORT}`);
// });

// Simulate receiving JSON from HPC
const sampleJSON = {
  sensor: "temperature",
  value: 30.5,
  unit: "Celsius"
};

// Function to detect and convert any data format to JSON
async function convertToJson(data) {
  if (typeof data === 'object') {
      return data;  // Already JSON
  }

  if (typeof data === 'string') {
      // Check if it's a JSON string
      try {
          return JSON.parse(data);
      } catch (error) {}

      // Check if it's XML
      if (data.trim().startsWith('<')) {
          return new Promise((resolve, reject) => {
              xml2js.parseString(data, { explicitArray: false }, (err, result) => {
                  if (err) reject(err);
                  else resolve(result);
              });
          });
      }

      // Check if it's YAML
      if (data.includes(':') && !data.includes('{')) {
          try {
              return YAML.parse(data);
          } catch (error) {}
      }

      // Assume CSV (handle dynamically)
      if (data.includes(',') && !data.includes(':')) {
          return new Promise((resolve, reject) => {
              const results = [];
              const stream = require('stream');
              const bufferStream = new stream.PassThrough();
              bufferStream.end(Buffer.from(data));

              bufferStream
                  .pipe(csvParser())
                  .on('data', (row) => results.push(row))
                  .on('end', () => resolve(results))
                  .on('error', (err) => reject(err));
          });
      }
  }

  // If no format detected, return as raw JSON
  return { rawData: data };
}

async function convertReqDataToJson(req) {
    const contentType = req.headers['content-type'];

    if (contentType === 'application/json') {
        // Already JSON, return as is
        return req.body;
    }

    if (contentType === 'application/xml') {
        const rawXml = typeof req.body === 'string' ? req.body.trim() : '';

        // Convert XML to JSON
        return new Promise((resolve, reject) => {
            xml2js.parseString(rawXml, { explicitArray: false }, (err, result) => {
                if (err) {
                    return reject(err);
                }
        
                // Convert `<sensor>` elements to an array if there are multiple
                if (result.sensor && !Array.isArray(result.sensor)) {
                    result.sensor = [result.sensor];
                }
        
                resolve(result);
            });
        });
    }

    if (contentType === 'text/csv') {
        // Convert CSV to JSON dynamically
        return new Promise((resolve, reject) => {
            const results = [];
            
            // Ensure `req.body` is a string and trim unwanted spaces/newlines
            let csvText = typeof req.body === 'string' ? req.body.trim() : '';
            csvText = csvText.replace(/\\n/g, '\n');

            // let csvText = '';
            // if (typeof req.body === 'string') {
            //     csvText = req.body.trim().replace(/\\n/g, '\n');
            // } else if (Buffer.isBuffer(req.body)) {
            //     csvText = req.body.toString().trim().replace(/\\n/g, '\n');
            // } else {
            //     throw new Error("CSV body must be a string or buffer.");
            // }
    
            // If the CSV is empty, reject the promise
            if (!csvText) {
                return reject(new Error("CSV data is empty"));
            }
    
            console.log("📩 Raw CSV Data:", csvText);  // Log incoming raw CSV data
    
            // Convert the CSV string into a readable stream
            const readableStream = Readable.from([csvText]); // Correctly handle CSV as a stream
            console.log("Readable stream", readableStream);
            // Parse the CSV stream
            readableStream
                .pipe(csvParser()) // Pipe stream to CSV parser
                .on('data', (row) => {
                    console.log("✅ Parsed Row:", row); // Log each parsed row
                    results.push(row); // Push the row as JSON
                })
                .on('end', () => {
                    console.log("✅ Parsed CSV Data:", results);  // Log final results
                    resolve(results);  // Resolve with parsed data
                })
                .on('error', (err) => {
                    console.error("❌ Error parsing CSV:", err);
                    reject(err);  // Reject on error
                });
        });
    }

    // if(contentType === 'text/csv')
    // {
    //     try {
    //         if (!req || !req.body) {
    //             throw new Error("Request body is empty or invalid.");
    //         }
    
    //         let csvText = req.body.trim(); // Ensure the body is a valid string
    //         csvText = csvText.replace(/\\n/g, '\n');
    //         if (!csvText) throw new Error("CSV data is empty");
    //         console.log("CSV text is ", csvText);
    //         const lines = csvText.split("\n"); // Split CSV into lines
    //         console.log("lines text is ", lines);
    //         const headers = lines[0].split(","); // Extract headers
    //         console.log("lines text is ", headers);
    //         const jsonData = lines.slice(1).map(line => {
    //             const values = line.split(","); // Split each row into values
    //             return headers.reduce((obj, header, index) => {
    //                 obj[header.trim()] = values[index] ? values[index].trim() : ""; // Trim values
    //                 return obj;
    //             }, {});
    //         });
    
    //         console.log("Parsed CSV Data:", jsonData);
    //         return jsonData;
    //     } catch (error) {
    //         console.error("CSV Parsing Error:", error);
    //         throw error;
    //     }
    // }

    if (contentType === 'application/x-yaml') {
        // Convert YAML to JSON
        try {
            return YAML.parse(req.body);
        } catch (error) {
            throw new Error("Invalid YAML format");
        }
    }

    throw new Error("Unsupported content type");
}


const sampleInputs = {
  json: `{"sensor": "temperature", "value": 36.5, "unit": "Celsius","humidity":80}`,
  xml: `<sensor><type>temperature</type><value>36.5</value><unit>Celsius</unit></sensor>`,
  yaml: `sensor: temperature\nvalue: 36.5\nunit: Celsius`,
  csv: `sensor,value,unit\ntemperature,36.5,Celsius`
};
// Call function to store JSON in Ethereum
// storeDataToETH(sampleJSON);

// Start listening for Ethereum events
// fetchDataById(26);

// fetchAllDataFromEth();

// getDataFromFabric("2");

// getAllFabricData();

// getAllIds();


// (async () => {
//   for (const [format, data] of Object.entries(sampleInputs)) {
//       console.log(`\n🔄 Converting ${format.toUpperCase()} to JSON...`);
//       await storeDataToETH(data);
//   }

//   fetchAllDataFromEth();
// })();


//Fabric functions
// Function to get the network and contract
async function getContract() {
  const wallet = await Wallets.newFileSystemWallet(walletPath);
  const gateway = new Gateway();
//   console.log(ccpPath);
   const ccpPath = {
    name: "fabric-network",
    version: "1.0.0",
    client: {
        organization: "Org1",
        connection: {
            timeout: {
                peer: { endorser: "300" },
                orderer: "300"
            }
        }
    },
    organizations: {
        Org1: {
            mspid: "Org1MSP",
            peers: ["peer0.org1.example.com"],
            certificateAuthorities: ["ca.org1.example.com"]
        }
    },
    peers: {
        "peer0.org1.example.com": {
            url: "grpcs://localhost:7051",
            tlsCACerts: {
                pem: fs.readFileSync(path.resolve(__dirname, "fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem"), "utf8")
            },
            grpcOptions: {
                "ssl-target-name-override": "peer0.org1.example.com",
                "hostnameOverride": "peer0.org1.example.com"
            }
        }
    },
    certificateAuthorities: {
        "ca.org1.example.com": {
            url: "https://localhost:7054",
            caName: "ca-org1",
            tlsCACerts: {
                pem: fs.readFileSync(path.resolve(__dirname, "fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem"), "utf8")
            }
        }
    }
};
  await gateway.connect(ccpPath, { wallet, identity: 'admin', discovery: { enabled: true, asLocalhost: true } });

  const network = await gateway.getNetwork(channelName);
  const contract = network.getContract(chaincodeName);

//   console.log(network);

  return { gateway, contract };
}

// Function to invoke the storeData function of the chaincode
async function storeDataInFabric(jsonData) {
  const { contract, gateway } = await getContract();
  
  await contract.submitTransaction('storeData', JSON.stringify(jsonData));
  console.log(`Data ${jsonData} stored successfully in Fabric.`);
  
  await gateway.disconnect();
}

async function getAllFabricData() {
    const { contract, gateway } = await getContract();
  
    const result = await contract.evaluateTransaction('getAllData');
    const parsedResult = JSON.parse(result.toString());

    console.log("✅ Data from Fabric:", parsedResult); // Print data
    
    await gateway.disconnect();
    return JSON.parse(result.toString());
}

// Function to query data from Fabric (e.g., getData)
async function getDataFromFabric(id) {
  const { contract, gateway } = await getContract();

  // Query the data for the given ID
  const result = await contract.evaluateTransaction('getData', id);
  console.log(`Data for ID ${id}:`, result.toString());

  await gateway.disconnect();
  return JSON.parse(result.toString());
}

async function testFabric() {
  try {
      const testData = {
          sensor: "temperature",
          value: 37.5,
          unit: "Celsius",
          type:"weatherData"
      };

    //   Store data
    //   await storeDataInFabric("3", testData);

      // Query the stored data
      const data = await getDataFromFabric("3");
      console.log("Queried Data:", data);

  } catch (error) {
      console.error('Error:', error);
  }
}

app.post('/storeData', async (req, res) => {
    try {
        const data = req.body;
        console.log("Request ",req.body);
        const jsonData = await convertReqDataToJson(req);
        console.log("Converted data ", jsonData);
        await storeDataInFabric(jsonData); // Store the data in Fabric
        getAllFabricData();
        res.status(200).send({ message: `Data stored successfully in Fabric.` });
    } catch (error) {
        console.error('Error storing data:', error);
        res.status(500).send({ error: error.message });
    }
});

app.post('/storeDataOnEth', async (req, res) => {
    try {
        console.log("Request ",req.body);
        const data = await convertReqDataToJson(req);
        console.log("Converted data ", data);
        await storeDataToETH(data); 
        fetchAllDataFromEth();
        res.status(200).send({ message: `Data stored successfully in Eth.` });
    } catch (error) {
        console.error('Error storing data:', error);
        res.status(500).send({ error: error.message });
    }
});

// Handle GET request to root route
app.get("/", (req, res) => {
    res.send("<h1>Middleware is Running</h1>");
});

async function registerEnrollUser(){

    console.log(__dirname);
    const ccpPath = path.resolve(__dirname,'fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json')
    console.log(ccpPath)
    const ccp = JSON.parse(fs2.readFileSync(ccpPath, 'utf8'));

    // const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
    // const caTLSCACerts = caInfo.tlsCACerts.pem;
    
    const caTLSCACertsPath = path.resolve(__dirname, 'fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem');
    const caTLSCACerts = fs.readFileSync(caTLSCACertsPath, 'utf8');
    const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
    const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    // console.log(ca)
    console.log("Wallet:", wallet);
    const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });

    // Create the identity to be stored in the wallet
    const x509Identity = {
        credentials: {
            certificate: enrollment.certificate,
            privateKey: enrollment.key.toBytes(),
        },
        mspId: 'Org1MSP',
        type: 'X.509',
    };

    // Store the identity in the wallet
    await wallet.put('admin', x509Identity);
    console.log('Successfully enrolled admin user "admin" and imported it into the wallet');
    // const walletPath = path.join(process.cwd(), 'wallet');
    // const wallet = await Wallets.newFileSystemWallet(walletPath);
    // console.log("Wallet:",wallet);

    // try 
    // {
    //     const identity = await wallet.get('admin');
    //     if (identity) {
    //         console.log('An identity for the admin user "admin" already exists in the wallet');
    //         return;
    //     }

    // const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
    // const x509Identity = {
    //         credentials: {
    //             certificate: enrollment.certificate,
    //             privateKey: enrollment.key.toBytes(),
    //         },
    //         mspId: 'Org1MSP',
    //         type: 'X.509',
    // };
    // await wallet.put('admin', x509Identity);
    // console.log('Successfully enrolled admin user "admin" and imported it into the wallet');
    // }
    // catch(error)
    // {
    //     console.error(`Failed to enroll admin user "admin": ${error}`);
    //     process.exit(1);
    // }
    
    
}

//Testing functions
// testFabric();
// registerEnrollUser();

// Start the middleware server

let SensorDataMessage;
protobuf.load(path.join(__dirname, 'sensor.proto'))
  .then(root => {
    SensorDataMessage = root.lookupType('SensorData');
    console.log("✅ Protobuf schema loaded");
  })
  .catch(err => {
    console.error("❌ Failed to load protobuf schema:", err);
  });

const supportedContentTypes = {
  'application/msgpack': (raw) => msgpack.decode(raw),
  'application/cbor': (raw) => cbor.decodeFirstSync(raw),
  'application/x-protobuf': (raw) => {
    if (!SensorDataMessage) throw new Error("Protobuf schema not loaded");
    return SensorDataMessage.decode(raw);
  },
};


// Middleware to handle MsgPack
// app.use(async (req, res, next) => {
//     const contentType = req.headers['content-type'];

//     if (contentType === 'application/msgpack') {
//         let data = [];
//         req.on('data', chunk => {
//             data.push(chunk);
//         });

//         req.on('end', async () => {
//             try {
//                 const buffer = Buffer.concat(data);

//                 // Check the length of the data, trim it if necessary
//                 const contentLength = parseInt(req.headers['content-length']);
//                 const expectedData = buffer.slice(0, contentLength);

//                 // Decode the MsgPack data
//                 const decodedObject = decode(expectedData);
//                 req.body = decodedObject;

//                 next();
//             } catch (error) {
//                 console.error('Decode Error:', error);
//                 res.status(400).send('Invalid MsgPack');
//             }
//         });
//     } else {
//         next();
//     }
// });

app.use(async (req, res, next) => {
    const contentType = req.headers['content-type'];
  
    if (contentType && supportedContentTypes[contentType]) {
      try {
        const raw = await getRawBody(req, {
          length: req.headers['content-length'],
        });
  
        console.log(`🔹 Received ${contentType} raw length:`, raw.length);
  
        const decoder = supportedContentTypes[contentType];
        req.body = decoder(raw);
  
        console.log("✅ Decoded Body:", req.body);
  
        return next();
      } catch (error) {
        console.error("❌ Decode Error:", error);
        return res.status(400).json({ success: false, error: "Invalid format for " + contentType });
      }
    } else {
      return next();
    }
  });

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Middleware server running on port ${PORT}`);
});

async function testEthereumThroughput() {
    const numTransactions = 50;
    const start = Date.now();

    let successCount = 0;
    for (let i = 0; i < numTransactions; i++) {
        try {
            const txHash = await storeDataToETH(sampleJSON);
            successCount++;
        } catch (error) {
            // Ignore errors for now; you could log them for debugging purposes if needed
        }
    }

    const end = Date.now();
    const throughput = (successCount / ((end - start) / 1000)).toFixed(2); // tx/sec
    console.log(`Ethereum Transaction Throughput: ${throughput} tx/sec (Processed ${successCount} out of ${numTransactions})`);
}

// Throughput Test for Hyperledger Fabric
async function testFabricThroughput() {
    const numTransactions = 50;
    const start = Date.now();

    let successCount = 0;
    for (let i = 0; i < numTransactions; i++) {
        try {
            const txId = await storeDataInFabric(sampleJSON);
            successCount++;
        } catch (error) {
            // Ignore errors for now; you could log them for debugging purposes if needed
        }
    }

    const end = Date.now();
    const throughput = (successCount / ((end - start) / 1000)).toFixed(2); // tx/sec
    console.log(`Hyperledger Fabric Transaction Throughput: ${throughput} tx/sec (Processed ${successCount} out of ${numTransactions})`);

    // await gateway.disconnect(); // Disconnect from the network after tests
}

async function testEthereumStorageLatency() {
    const numTransactions = 15;
    let totalLatency = 0;
    
    for (let i = 0; i < numTransactions; i++) {
        try {
            const start = Date.now();
            const txHash = await storeDataToETH(sampleJSON);
            const end = Date.now();
            totalLatency += (end - start); // in ms
            // successCount++;
        } catch (error) {
            // Ignore errors for now; you could log them for debugging purposes if needed
        }
    }
    const averageLatency = totalLatency / numTransactions; // Average latency
    console.log(`Fabric Storage Latency (Avg): ${averageLatency} ms`);
}

async function testFabricStorageLatency() {
    const numTransactions = 15;
    let totalLatency = 0;
    
    for (let i = 0; i < numTransactions; i++) {
        try {
            const start = Date.now();
            const txHash = await storeDataInFabric(sampleJSON);
            const end = Date.now();
            totalLatency += (end - start); // in ms
            // successCount++;
        } catch (error) {
            // Ignore errors for now; you could log them for debugging purposes if needed
        }
    }
    const averageLatency = totalLatency / numTransactions; // Average latency
    console.log(`Fabric Storage Latency (Avg): ${averageLatency} ms`);
}

async function testEthereumQueryLatency() {
    const numTransactions = 80;
    let totalLatency = 0;
    
    for (let i = 0; i < numTransactions; i++) {
        try {
            const start = Date.now();
            const txHash = await fetchDataById(i);
            const end = Date.now();
            totalLatency += (end - start); // in ms
            // successCount++;
        } catch (error) {
            // Ignore errors for now; you could log them for debugging purposes if needed
        }
    }
    const averageLatency = totalLatency / numTransactions; // Average latency
    console.log(`Ethereum Query Latency (Avg): ${averageLatency} ms`);
}

async function testFabricQueryLatency() {
    const numTransactions = 80;
    let totalLatency = 0;
    
    for (let i = 1; i <=numTransactions; i++) {
        try {
            const start = Date.now();
            const txHash = await getDataFromFabric(i.toString());
            // console.log(i.toString());
            const end = Date.now();
            totalLatency += (end - start); // in ms
            // successCount++;
        } catch (error) {
            // Ignore errors for now; you could log them for debugging purposes if needed
        }
    }
    const averageLatency = totalLatency / numTransactions; // Average latency
    console.log(`Fabric Query Latency (Avg): ${averageLatency} ms`);
}


// Define supported format parsers
const formatParsers = {
    json: (data) => JSON.parse(data),

    xml: (data) =>
        new Promise((resolve, reject) => {
            xml2js.parseString(data, { explicitArray: false }, (err, result) => {
                err ? reject(new Error("Invalid XML format")) : resolve(result);
            });
        }),

    csv: (data) =>
        new Promise((resolve, reject) => {
            const results = [];
            const stream = Readable.from([data]);

            stream.pipe(csvParser())
                .on('data', (row) => results.push(row))
                .on('end', () => resolve(results))
                .on('error', (err) => reject(new Error("CSV Parsing Error: " + err)));
        }),

    yaml: (data) => YAML.parse(data),

    protobuf: async (data, schema) => {
        try {
            const root = await protobuf.load(schema);
            const MessageType = root.lookupType('SensorData');
            return MessageType.decode(data);
        } catch (error) {
            throw new Error("Invalid Protobuf format");
        }
    },

    msgpack: (data) => msgpack.decode(data),
    
    cbor: (data) => cbor.decodeFirstSync(data),
};

// Auto-detect format and convert
async function convertReqFromIoTtoJson(data, schema = null) {
    if (typeof data === 'object') {
        return data; // Already JSON
    }

    if (typeof data !== 'string' && !Buffer.isBuffer(data)) {
        throw new Error("Invalid or empty data");
    }

    data = data.trim(); 
    // Remove unnecessary spaces if string

    // Check IoT binary formats (Protobuf, MsgPack, CBOR)
    if (Buffer.isBuffer(data)) {
        for (const [format, parser] of Object.entries(formatParsers)) {
            if (['protobuf', 'msgpack', 'cbor'].includes(format)) {
                try {
                    return await parser(data, schema);
                } catch (error) {}
            }
        }
    }

    // Check text-based formats (JSON, XML, YAML, CSV)
    for (const [format, parser] of Object.entries(formatParsers)) {
        if (!['protobuf', 'msgpack', 'cbor'].includes(format)) {
            try {
                return await parser(data);
            } catch (error) {}
        }
    }

    // If no format detected, return raw data as a JSON object
    return { rawData: data };
}

// testEthereumThroughput().catch(console.error);
// testFabricThroughput().catch(console.error);
// testFabricStorageLatency().catch(console.error);
// testEthereumQueryLatency().catch(console.error);
// testFabricQueryLatency().catch(console.error);

// API Endpoint
app.post('/convert', async (req, res) => {
    try {
        console.log(req.body);
        const convertedData = await convertReqFromIoTtoJson(req.body);
        // const convertedData = req.body;
        console.log("✅ Inside /convert handler:", convertedData);
        console.log(fetchDataById(121));
        // res.json({ success: true, data: req.body });
        res.json({ success: true, data: convertedData });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});


//#region  store IOT data on Ethereum
app.post('/storeIotDataOnEth', async (req, res) => {
    try {
        console.log("Request ",req.body);
        const data = await convertReqFromIoTtoJson(req.body);
        console.log("Converted data ", data);
        await storeDataToETH(data); 
        // await storeDataInFabric(data);
        fetchAllDataFromEth();
        // getAllFabricData();
        res.status(200).send({ message: `Data stored successfully in Eth.` });
    } catch (error) {
        console.error('Error storing data:', error);
        res.status(500).send({ error: error.message });
    }
});

//#endregion



//#region  store IOT data on Fabric
app.post('/storeIotDataOnFabric', async (req, res) => {
    try {
        console.log("Request ",req.body);
        const data = await convertReqFromIoTtoJson(req.body);
        console.log("Converted data ", data);
        // await storeDataToETH(data); 
        await storeDataInFabric(data);
        // fetchAllDataFromEth();
        getAllFabricData();
        res.status(200).send({ message: `Data stored successfully in Fabric.` });
    } catch (error) {
        console.error('Error storing data:', error);
        res.status(500).send({ error: error.message });
    }
});

//#endregion