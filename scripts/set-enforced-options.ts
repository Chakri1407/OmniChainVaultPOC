import { EndpointId } from '@layerzerolabs/lz-definitions'

// Contract addresses - Updated with actual deployed addresses
const CONTRACTS = {
    holesky: {
        MyAssetOFT: '0x30647974468D019eb455FA0c14Ba85cCd7C46427',
        MyShareOFTAdapter: '0x3Cb670dcb1da1d492BE5Ff8352F1D94F551E5F37',
        MyShareOFT: '0xa4d30c2012Cea88c81e4b291dD689D5250a8fB11',
    },
    amoy: {
        MyAssetOFT: '0xE0437f8897f630093E59e0fb8a3570dd9072DC7C',
        MyShareOFTAdapter: '0x08ecf76E8876f32Ef354E5D47F61D7b164b14E9B',
        MyShareOFT: '0x9A5DBBC717917BAec58E5eca0571075EA2342d5e',
    }
}

async function setEnforcedOptions() {
    const hre = require('hardhat')
    const [deployer] = await hre.ethers.getSigners()
    
    console.log(`Setting enforced options on ${hre.network.name} with deployer: ${deployer.address}`)
    
    let localContracts: any
    let dstEid: number
    let networkName: string
    
    if (hre.network.name === 'holesky') {
        localContracts = CONTRACTS.holesky
        dstEid = EndpointId.AMOY_V2_TESTNET
        networkName = 'Amoy'
    } else if (hre.network.name === 'amoy') {
        localContracts = CONTRACTS.amoy
        dstEid = EndpointId.HOLESKY_V2_TESTNET
        networkName = 'Holesky'
    } else {
        throw new Error(`Unsupported network: ${hre.network.name}`)
    }
    
    console.log(`Setting enforced options for ${networkName} (EID ${dstEid})\n`)
    
    // Standard enforced options for OFT with 200k gas
    const enforcedOptionsBytes = '0x00030100110100000000000000000000000000030d40'
    
    const enforcedOptions = [
        {
            eid: dstEid,
            msgType: 1, // SEND message type for OFT
            options: enforcedOptionsBytes
        }
    ]
    
    // Set enforced options for Asset OFT
    console.log('1. Setting Asset OFT enforced options...')
    try {
        const AssetOFT = await hre.ethers.getContractFactory('MyAssetOFT')
        const assetOFT = AssetOFT.attach(localContracts.MyAssetOFT)
        
        console.log(`   Contract: ${localContracts.MyAssetOFT}`)
        console.log(`   Destination EID: ${dstEid}`)
        console.log(`   Options: ${enforcedOptionsBytes}`)
        
        const tx1 = await assetOFT.setEnforcedOptions(enforcedOptions)
        console.log(`   Transaction: ${tx1.hash}`)
        await tx1.wait()
        console.log(`   ✅ Asset OFT enforced options set successfully`)
        
        // Verify the options were set
        try {
            const setOptions = await assetOFT.enforcedOptions(dstEid, 1)
            console.log(`   Verified enforced options: ${setOptions}`)
        } catch (verifyErr: any) {
            console.log('   Could not verify options, but setting transaction was successful')
        }
    } catch (error) {
        console.log(`   ❌ Asset OFT enforced options failed: ${error}`)
    }
    
    // Set enforced options for Share OFT/Adapter
    console.log('\n2. Setting Share contract enforced options...')
    try {
        let shareContract: any
        let contractName: string
        let contractAddress: string
        let ShareContractFactory: any
        
        if (hre.network.name === 'holesky') {
            // On hub chain, use the adapter
            ShareContractFactory = await hre.ethers.getContractFactory('MyShareOFTAdapter')
            shareContract = ShareContractFactory.attach(localContracts.MyShareOFTAdapter)
            contractName = 'Share OFT Adapter'
            contractAddress = localContracts.MyShareOFTAdapter
        } else {
            // On spoke chain, use the OFT
            ShareContractFactory = await hre.ethers.getContractFactory('MyShareOFT')
            shareContract = ShareContractFactory.attach(localContracts.MyShareOFT)
            contractName = 'Share OFT'
            contractAddress = localContracts.MyShareOFT
        }
        
        console.log(`   Contract: ${contractAddress}`)
        console.log(`   Type: ${contractName}`)
        console.log(`   Destination EID: ${dstEid}`)
        console.log(`   Options: ${enforcedOptionsBytes}`)
        
        const tx2 = await shareContract.setEnforcedOptions(enforcedOptions)
        console.log(`   Transaction: ${tx2.hash}`)
        await tx2.wait()
        console.log(`   ✅ ${contractName} enforced options set successfully`)
        
        // Verify the options were set
        try {
            const setOptions = await shareContract.enforcedOptions(dstEid, 1)
            console.log(`   Verified enforced options: ${setOptions}`)
        } catch (verifyErr: any) {
            console.log('   Could not verify options, but setting transaction was successful')
        }
    } catch (error) {
        console.log(`   ❌ Share contract enforced options failed: ${error}`)
    }
    
    console.log(`\n🎉 Enforced options configuration completed for ${hre.network.name} -> ${networkName}`)
    console.log('\n📝 What enforced options do:')
    console.log('- Ensure minimum gas is provided for cross-chain execution')
    console.log('- Prevent failed transactions due to insufficient gas')
    console.log('- Set to 200k gas which should handle most OFT operations')
    console.log('\n📝 Next steps:')
    console.log('1. Run this script on the other network')
    console.log('2. Test cross-chain transfers')
    console.log('3. Monitor gas usage and adjust if needed')
}

setEnforcedOptions()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error setting enforced options:', error)
        process.exit(1)
    }) 