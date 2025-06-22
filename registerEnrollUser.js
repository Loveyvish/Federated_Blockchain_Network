//#region  enrollAdminUser

const path = require('node:path');
const fs2 = require('fs');
const FabricCAServices = require('fabric-ca-client');
const { Wallets, Gateway } = require('fabric-network');

async function registerEnrollUser(){

    console.log(__dirname);

    const ccpPath = path.resolve(__dirname,'./fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json')
    const ccp = JSON.parse(fs2.readFileSync(ccpPath, 'utf8'));

    const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
    const caTLSCACerts = caInfo.tlsCACerts.pem;
    const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log("Wallet:",wallet);

    try 
    {
        const identity = await wallet.get('admin');
        if (identity) {
            console.log('An identity for the admin user "admin" already exists in the wallet');
            return;
        }

    const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
    const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
    };
    await wallet.put('admin', x509Identity);
    console.log('Successfully enrolled admin user "admin" and imported it into the wallet');
    }
    catch(error)
    {
        console.error(`Failed to enroll admin user "admin": ${error}`);
        process.exit(1);
    }
    
}

registerEnrollUser();

//#endregion