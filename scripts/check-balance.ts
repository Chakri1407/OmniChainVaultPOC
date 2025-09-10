// Contract addresses - Updated with actual deployed addresses
const CONTRACTS = {
    holesky: {
        MyAssetOFT: '0x30647974468D019eb455FA0c14Ba85cCd7C46427',
        MyERC4626: '0xed551eC80eCF9F59941D65B3474b4b7B4EA4f152',
        MyShareOFTAdapter: '0x3Cb670dcb1da1d492BE5Ff8352F1D94F551E5F37',
        MyShareOFT: '0xa4d30c2012Cea88c81e4b291dD689D5250a8fB11',
        MyOVaultComposer: '0x3D25e66FC7AeA970A2d4AeFD0042F47b41373Ce1',
    },
    amoy: {
        MyAssetOFT: '0xE0437f8897f630093E59e0fb8a3570dd9072DC7C',
        MyShareOFT: '0x9A5DBBC717917BAec58E5eca0571075EA2342d5e',
        MyOVaultComposer: '0x7f7f66c6fe2473FC477716347C6eA42D0DFC406D',
    }
}

async function checkBalances() {
    const hre = require('hardhat')
    const [deployer] = await hre.ethers.getSigners()
    
    console.log(`Checking balances on ${hre.network.name}`)
    console.log(`Account: ${deployer.address}\n`)
    
    let contracts: any
    
    if (hre.network.name === 'holesky') {
        contracts = CONTRACTS.holesky
    } else if (hre.network.name === 'amoy') {
        contracts = CONTRACTS.amoy
    } else {
        throw new Error(`Unsupported network: ${hre.network.name}`)
    }
    
    // Check ETH balance
    console.log('Native Token Balance:')
    const ethBalance = await deployer.getBalance()
    console.log(`   ${hre.network.name === 'holesky' ? 'ETH' : 'MATIC'}: ${hre.ethers.utils.formatEther(ethBalance)}`)
    
    // Check Asset OFT balance
    console.log('\nAsset OFT Balance:')
    try {
        const AssetOFT = await hre.ethers.getContractFactory('MyAssetOFT')
        const assetOFT = AssetOFT.attach(contracts.MyAssetOFT)
        const assetBalance = await assetOFT.balanceOf(deployer.address)
        const assetSymbol = await assetOFT.symbol()
        const assetName = await assetOFT.name()
        
        console.log(`   ${assetName} (${assetSymbol}): ${hre.ethers.utils.formatEther(assetBalance)}`)
        console.log(`   Contract: ${contracts.MyAssetOFT}`)
    } catch (error) {
        console.log(`   Could not fetch Asset OFT balance: ${error}`)
    }
    
    // Check Vault balance (only on Holesky)
    if (hre.network.name === 'holesky') {
        console.log('\nVault Share Balance:')
        try {
            const Vault = await hre.ethers.getContractFactory('MyERC4626')
            const vault = Vault.attach(contracts.MyERC4626)
            const shareBalance = await vault.balanceOf(deployer.address)
            const shareSymbol = await vault.symbol()
            const shareName = await vault.name()
            
            console.log(`   ${shareName} (${shareSymbol}): ${hre.ethers.utils.formatEther(shareBalance)}`)
            console.log(`   Contract: ${contracts.MyERC4626}`)
            
            // Additional vault info
            const totalAssets = await vault.totalAssets()
            const totalSupply = await vault.totalSupply()
            
            console.log(`\nVault Information:`)
            console.log(`   Total Assets: ${hre.ethers.utils.formatEther(totalAssets)} TASSET`)
            console.log(`   Total Supply: ${hre.ethers.utils.formatEther(totalSupply)} TVS`)
            
            if (totalSupply.gt(0)) {
                const assetsPerShare = await vault.convertToAssets(hre.ethers.utils.parseEther('1'))
                console.log(`   Assets per Share: ${hre.ethers.utils.formatEther(assetsPerShare)} TASSET`)
            }
            
        } catch (error) {
            console.log(`   Could not fetch Vault balance: ${error}`)
        }
    }
    
    // Check Share OFT balance (spoke chains or hub)
    console.log('\nShare OFT Balance:')
    try {
        let shareOFTAddress: string
        let contractType: string
        
        if (hre.network.name === 'holesky') {
            shareOFTAddress = contracts.MyShareOFT
            contractType = 'Share OFT (Hub)'
        } else {
            shareOFTAddress = contracts.MyShareOFT
            contractType = 'Share OFT (Spoke)'
        }
        
        const ShareOFT = await hre.ethers.getContractFactory('MyShareOFT')
        const shareOFT = ShareOFT.attach(shareOFTAddress)
        const shareOFTBalance = await shareOFT.balanceOf(deployer.address)
        const shareOFTSymbol = await shareOFT.symbol()
        const shareOFTName = await shareOFT.name()
        
        console.log(`   ${shareOFTName} (${shareOFTSymbol}): ${hre.ethers.utils.formatEther(shareOFTBalance)}`)
        console.log(`   Contract: ${shareOFTAddress}`)
        console.log(`   Type: ${contractType}`)
    } catch (error) {
        console.log(`   Could not fetch Share OFT balance: ${error}`)
    }
    
    // Show contract addresses summary
    console.log('\nContract Addresses Summary:')
    Object.entries(contracts).forEach(([name, address]) => {
        console.log(`   ${name}: ${address}`)
    })
    
    // LayerZero info
    console.log('\nLayerZero Information:')
    try {
        const AssetOFT = await hre.ethers.getContractFactory('MyAssetOFT')
        const assetOFT = AssetOFT.attach(contracts.MyAssetOFT)
        const endpoint = await assetOFT.endpoint()
        console.log(`   LayerZero Endpoint: ${endpoint}`)
        
        // Check if peers are configured
        const holeskyEid = 40217  // Holesky testnet EID
        const amoyEid = 40267     // Amoy testnet EID
        
        const peerEid = hre.network.name === 'holesky' ? amoyEid : holeskyEid
        const peerName = hre.network.name === 'holesky' ? 'Amoy' : 'Holesky'
        
        const peer = await assetOFT.peers(peerEid)
        const isPeerSet = peer !== '0x0000000000000000000000000000000000000000000000000000000000000000'
        
        console.log(`   Peer for ${peerName} (EID ${peerEid}): ${isPeerSet ? 'Set' : 'Not set'}`)
        if (isPeerSet) {
            console.log(`   Peer address: ${peer}`)
        }
        
    } catch (error) {
        console.log(`   Could not fetch LayerZero info: ${error}`)
    }
    
    console.log('\nBalance check completed!')
}

checkBalances()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error checking balances:', error)
        process.exit(1)
    }) 