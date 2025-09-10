import { EndpointId } from '@layerzerolabs/lz-definitions'

// Contract addresses - Updated with actual deployed addresses
const CONTRACTS = {
    holesky: {
        MyAssetOFT: '0x30647974468D019eb455FA0c14Ba85cCd7C46427',
        MyShareOFTAdapter: '0x3Cb670dcb1da1d492BE5Ff8352F1D94F551E5F37',
    },
    amoy: {
        MyAssetOFT: '0xE0437f8897f630093E59e0fb8a3570dd9072DC7C',
        MyShareOFT: '0x9A5DBBC717917BAec58E5eca0571075EA2342d5e',
    }
}

async function testCrossChainTransfer() {
    const hre = require('hardhat')
    const [deployer] = await hre.ethers.getSigners()
    
    console.log(`Testing cross-chain transfer from ${hre.network.name}`)
    console.log(`Deployer: ${deployer.address}`)
    
    let localContract: any
    let dstEid: number
    let remoteName: string
    let contractName: string
    let ContractFactory: any
    
    if (hre.network.name === 'holesky') {
        // Test Asset OFT transfer from Holesky to Amoy
        ContractFactory = await hre.ethers.getContractFactory('MyAssetOFT')
        localContract = ContractFactory.attach(CONTRACTS.holesky.MyAssetOFT)
        dstEid = EndpointId.AMOY_V2_TESTNET
        remoteName = 'Amoy'
        contractName = 'Asset OFT'
    } else if (hre.network.name === 'amoy') {
        // Test Asset OFT transfer from Amoy to Holesky
        ContractFactory = await hre.ethers.getContractFactory('MyAssetOFT')
        localContract = ContractFactory.attach(CONTRACTS.amoy.MyAssetOFT)
        dstEid = EndpointId.HOLESKY_V2_TESTNET
        remoteName = 'Holesky'
        contractName = 'Asset OFT'
    } else {
        throw new Error(`Unsupported network: ${hre.network.name}`)
    }
    
    console.log(`Testing ${contractName} cross-chain transfer to ${remoteName} (EID: ${dstEid})\n`)
    
    // Check initial balance
    const initialBalance = await localContract.balanceOf(deployer.address)
    console.log(`Initial balance: ${hre.ethers.utils.formatEther(initialBalance)} tokens`)
    
    if (initialBalance.eq(0)) {
        console.log('❌ No tokens to transfer. Mint some tokens first.')
        return
    }
    
    // Amount to transfer (1 token)
    const transferAmount = hre.ethers.utils.parseEther('1')
    const recipient = deployer.address // Send to ourselves on the destination chain
    
    console.log(`Transferring ${hre.ethers.utils.formatEther(transferAmount)} tokens`)
    console.log(`From: ${hre.network.name}`)
    console.log(`To: ${remoteName}`)
    console.log(`Recipient: ${recipient}`)
    
    try {
        // Get quote for the cross-chain transfer
        console.log('\n1. Getting quote for cross-chain transfer...')
        
        const sendParam = {
            dstEid: dstEid,
            to: hre.ethers.utils.zeroPad(recipient, 32), // Fix: Use zeroPad instead of solidityPack
            amountLD: transferAmount,
            minAmountLD: transferAmount,
            extraOptions: '0x',
            composeMsg: '0x',
            oftCmd: '0x'
        }
        
        const quote = await localContract.quoteSend(sendParam, false)
        const nativeFee = quote.nativeFee
        
        console.log(`   Native fee required: ${hre.ethers.utils.formatEther(nativeFee)} ETH`)
        
        // Check if we have enough ETH for fees
        const balance = await deployer.getBalance()
        console.log(`   Deployer ETH balance: ${hre.ethers.utils.formatEther(balance)} ETH`)
        
        if (balance.lt(nativeFee)) {
            console.log('❌ Insufficient ETH balance for cross-chain transfer fees')
            return
        }
        
        // Perform the cross-chain transfer
        console.log('\n2. Executing cross-chain transfer...')
        
        const tx = await localContract.send(
            sendParam,
            { nativeFee: nativeFee, lzTokenFee: 0 },
            deployer.address,
            { value: nativeFee }
        )
        
        console.log(`   Transaction hash: ${tx.hash}`)
        console.log(`   Waiting for confirmation...`)
        
        const receipt = await tx.wait()
        console.log(`   ✅ Transaction confirmed!`)
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`)
        console.log(`   Block number: ${receipt.blockNumber}`)
        
        // Check new balance
        const newBalance = await localContract.balanceOf(deployer.address)
        const transferred = initialBalance.sub(newBalance)
        
        console.log(`\n3. Transfer Summary:`)
        console.log(`   Initial balance: ${hre.ethers.utils.formatEther(initialBalance)} tokens`)
        console.log(`   New balance: ${hre.ethers.utils.formatEther(newBalance)} tokens`)
        console.log(`   Transferred: ${hre.ethers.utils.formatEther(transferred)} tokens`)
        console.log(`   Fee paid: ${hre.ethers.utils.formatEther(nativeFee)} ETH`)
        
        // Note about destination chain
        console.log(`\n📝 Note: Check the destination chain (${remoteName}) to verify tokens arrived`)
        console.log(`   Run: npx hardhat run scripts/check-balance.ts --network ${remoteName.toLowerCase()}`)
        
    } catch (error) {
        console.log(`❌ Cross-chain transfer failed: ${error}`)
        
        // Common error troubleshooting
        console.log('\n🔧 Troubleshooting:')
        console.log('1. Ensure peers are set on both chains')
        console.log('2. Check if enforced options are configured')
        console.log('3. Verify sufficient ETH for gas fees')
        console.log('4. Confirm contracts are deployed on both chains')
    }
}

testCrossChainTransfer()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error:', error)
        process.exit(1)
    }) 