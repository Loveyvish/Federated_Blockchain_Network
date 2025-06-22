//#region MSGPACK

// const axios = require('axios');
// const msgpack = require('@msgpack/msgpack');

// async function sendData() {
//     const payload = {
//         temperature: 23.5,
//         humidity: 60
//     };

//     const encoded = msgpack.encode(payload);
//     const buffer = Buffer.from(encoded);  // <-- wrap encoded Uint8Array into Buffer

//     const response = await axios.post('http://localhost:3002/storeIotDataOnEth', buffer, {
//         headers: {
//             'Content-Type': 'application/msgpack',
//             'Content-Length': buffer.length,  // use buffer length
//         },
//         transformRequest: [(data) => data],  // important to send raw
//         responseType: 'json'
//     });

//     console.log('Response:', response.data);
// }

// sendData();



//#endregion

//#region CBOR

// const cbor = require('cbor');
// const axios = require('axios');

// const data = { temperature: 22.5, humidity: 60 };
// const encoded = cbor.encode(data);

// console.log(encoded);
// axios.post('http://localhost:3002/convert', encoded, {
//     headers: {
//         'Content-Type': 'application/cbor',
//         'Content-Length': encoded.length
//     }
// })
// .then(res => console.log("✅ Success:", res.data))
// .catch(err => {
//     if (err.response) {
//         console.error("❌ Error Response:", err.response.data);
//     } else {
//         console.error("❌ Error Message:", err.message);
//     }
// });


//#endregion


//#region PROTOBUF


const protobuf = require('protobufjs');
const axios = require('axios');
const path = require('path');

async function sendProtobuf() {
    const root = await protobuf.load(path.join(__dirname, 'sensor.proto'));
    const SensorData = root.lookupType('SensorData');

    const payload = { temperature: 22.5, humidity: 60 };
    const message = SensorData.create(payload);
    const buffer = SensorData.encode(message).finish();

    await axios.post('http://localhost:3002/convert', buffer, {
        headers: {
            'Content-Type': 'application/x-protobuf',
            'Content-Length': buffer.length
        }
    })
    .then(res => console.log(res.data))
    .catch(err => console.error("Error:", err.response?.data || err.message));
}

sendProtobuf();


//#endregion




//#region  enrollAdminUser

// const path = require('node:path');
// const fs2 = require('fs');
// const FabricCAServices = require('fabric-ca-client');
// const { Wallets, Gateway } = require('fabric-network');

// async function registerEnrollUser(){

//     console.log(__dirname);

//     const ccpPath = path.resolve(__dirname,'./fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json')
//     const ccp = JSON.parse(fs2.readFileSync(ccpPath, 'utf8'));

//     const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
//     const caTLSCACerts = caInfo.tlsCACerts.pem;
//     const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

//     const walletPath = path.join(process.cwd(), 'wallet');
//     const wallet = await Wallets.newFileSystemWallet(walletPath);
//     console.log("Wallet:",wallet);

//     try 
//     {
//         const identity = await wallet.get('admin');
//         if (identity) {
//             console.log('An identity for the admin user "admin" already exists in the wallet');
//             return;
//         }

//     const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
//     const x509Identity = {
//             credentials: {
//                 certificate: enrollment.certificate,
//                 privateKey: enrollment.key.toBytes(),
//             },
//             mspId: 'Org1MSP',
//             type: 'X.509',
//     };
//     await wallet.put('admin', x509Identity);
//     console.log('Successfully enrolled admin user "admin" and imported it into the wallet');
//     }
//     catch(error)
//     {
//         console.error(`Failed to enroll admin user "admin": ${error}`);
//         process.exit(1);
//     }
    
// }

// registerEnrollUser();
//#endregion