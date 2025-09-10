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

async function setPeers() {
    const hre = require('hardhat')
    const [deployer] = await hre.ethers.getSigners()
    
    console.log(`Setting peers on ${hre.network.name} with deployer: ${deployer.address}`)
    
    let localContracts: any
    let remoteContracts: any
    let remoteEid: number
    let remoteName: string
    
    if (hre.network.name === 'holesky') {
        localContracts = CONTRACTS.holesky
        remoteContracts = CONTRACTS.amoy
        remoteEid = EndpointId.AMOY_V2_TESTNET
        remoteName = 'Amoy'
    } else if (hre.network.name === 'amoy') {
        localContracts = CONTRACTS.amoy
        remoteContracts = CONTRACTS.holesky
        remoteEid = EndpointId.HOLESKY_V2_TESTNET
        remoteName = 'Holesky'
    } else {
        throw new Error(`Unsupported network: ${hre.network.name}`)
    }
    
    console.log(`Setting peers for ${remoteName} (EID: ${remoteEid})\n`)
    
    // Set peer for Asset OFT
    console.log('1. Setting Asset OFT peer...')
    try {
        const AssetOFT = await hre.ethers.getContractFactory('MyAssetOFT')
        const assetOFT = AssetOFT.attach(localContracts.MyAssetOFT)
        
        const remotePeerBytes32 = hre.ethers.utils.hexZeroPad(remoteContracts.MyAssetOFT, 32)
        
        console.log(`   Local Asset OFT: ${localContracts.MyAssetOFT}`)
        console.log(`   Remote Asset OFT: ${remoteContracts.MyAssetOFT}`)
        console.log(`   Remote EID: ${remoteEid}`)
        
        const tx1 = await assetOFT.setPeer(remoteEid, remotePeerBytes32)
        console.log(`   Transaction: ${tx1.hash}`)
        await tx1.wait()
        console.log(`   ✅ Asset OFT peer set successfully`)
        
        // Verify peer was set
        const setPeer = await assetOFT.peers(remoteEid)
        console.log(`   Verified peer: ${setPeer}`)
    } catch (error) {
        console.log(`   ❌ Asset OFT peer setting failed: ${error}`)
    }
    
    // Set peer for Share OFT/Adapter
    console.log('\n2. Setting Share OFT peer...')
    try {
        let shareContract: any
        let contractName: string
        let ShareContractFactory: any
        
        if (hre.network.name === 'holesky') {
            // On hub chain, use the adapter
            ShareContractFactory = await hre.ethers.getContractFactory('MyShareOFTAdapter')
            shareContract = ShareContractFactory.attach(localContracts.MyShareOFTAdapter)
            contractName = 'Share OFT Adapter'
            console.log(`   Local Share Adapter: ${localContracts.MyShareOFTAdapter}`)
            console.log(`   Remote Share OFT: ${remoteContracts.MyShareOFT}`)
        } else {
            // On spoke chain, use the OFT
            ShareContractFactory = await hre.ethers.getContractFactory('MyShareOFT')
            shareContract = ShareContractFactory.attach(localContracts.MyShareOFT)
            contractName = 'Share OFT'
            console.log(`   Local Share OFT: ${localContracts.MyShareOFT}`)
            console.log(`   Remote Share Adapter: ${remoteContracts.MyShareOFTAdapter}`)
        }
        
        const remoteShareAddress = hre.network.name === 'holesky' 
            ? remoteContracts.MyShareOFT 
            : remoteContracts.MyShareOFTAdapter
            
        const remotePeerBytes32 = hre.ethers.utils.hexZeroPad(remoteShareAddress, 32)
        
        const tx2 = await shareContract.setPeer(remoteEid, remotePeerBytes32)
        console.log(`   Transaction: ${tx2.hash}`)
        await tx2.wait()
        console.log(`   ✅ ${contractName} peer set successfully`)
        
        // Verify peer was set
        const setPeer = await shareContract.peers(remoteEid)
        console.log(`   Verified peer: ${setPeer}`)
    } catch (error) {
        console.log(`   ❌ Share contract peer setting failed: ${error}`)
    }
    
    console.log(`\n🎉 Peer configuration completed for ${hre.network.name} -> ${remoteName}`)
    console.log('\n📝 Next steps:')
    console.log('1. Run this script on the other network')
    console.log('2. Set enforced options (optional but recommended)')
    console.log('3. Test cross-chain transfers')
}

setPeers()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error setting peers:', error)
        process.exit(1)
    }) 