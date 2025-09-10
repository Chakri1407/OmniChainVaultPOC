import { HardhatRuntimeEnvironment } from 'hardhat/types'
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
        MyShareOFT: '0x9A5DBBC717917BAec58E5eca0571075EA2342d5e',
    }
}

async function testCrossChainTransfer() {
    const hre: HardhatRuntimeEnvironment = require('hardhat')
    const [deployer] = await hre.ethers.getSigners()
    
    console.log(`\n=== Cross-Chain Transfer Tests on ${hre.network.name.toUpperCase()} ===`)
    console.log(`Deployer: ${deployer.address}`)
    
    let localContracts: any
    let dstEid: number
    let remoteName: string
    
    if (hre.network.name === 'holesky') {
        localContracts = CONTRACTS.holesky
        dstEid = EndpointId.AMOY_V2_TESTNET
        remoteName = 'Amoy'
    } else if (hre.network.name === 'amoy') {
        localContracts = CONTRACTS.amoy
        dstEid = EndpointId.HOLESKY_V2_TESTNET
        remoteName = 'Holesky'
    } else {
        throw new Error(`Unsupported network: ${hre.network.name}`)
    }
    
    // Test 1: Asset OFT Transfer
    await testAssetOFTTransfer(hre, localContracts, dstEid, remoteName)
    
    // Test 2: Share OFT Transfer (if available)
    if (hre.network.name === 'holesky' && localContracts.MyShareOFTAdapter) {
        await testShareOFTTransfer(hre, localContracts, dstEid, remoteName, true)
    } else if (hre.network.name === 'amoy' && localContracts.MyShareOFT) {
        await testShareOFTTransfer(hre, localContracts, dstEid, remoteName, false)
    }
    
    // Test 3: Batch Transfer Test
    await testBatchTransfers(hre, localContracts, dstEid, remoteName)
    
    // Test 4: Quote Accuracy Test
    await testQuoteAccuracy(hre, localContracts, dstEid, remoteName)
    
    // Test 5: Peer Configuration Test
    await testPeerConfiguration(hre, localContracts, dstEid, remoteName)
    
    console.log(`\n=== Cross-Chain Tests Completed on ${hre.network.name.toUpperCase()} ===`)
}

async function testAssetOFTTransfer(hre: any, contracts: any, dstEid: number, remoteName: string) {
    console.log(`\n--- Test 1: Asset OFT Cross-Chain Transfer ---`)
    
    try {
        const AssetOFT = await hre.ethers.getContractFactory('MyAssetOFT')
        const assetOFT = AssetOFT.attach(contracts.MyAssetOFT)
        
        const initialBalance = await assetOFT.balanceOf(hre.ethers.provider.getSigner().getAddress())
        console.log(`Initial Asset Balance: ${hre.ethers.utils.formatEther(initialBalance)} TASSET`)
        
        if (initialBalance.eq(0)) {
            console.log('No assets to transfer. Skipping asset transfer test.')
            return
        }
        
        // Test different transfer amounts
        const transferAmounts = [
            hre.ethers.utils.parseEther('0.1'),
            hre.ethers.utils.parseEther('1'),
            hre.ethers.utils.parseEther('5')
        ]
        
        for (let i = 0; i < transferAmounts.length; i++) {
            const amount = transferAmounts[i]
            const recipient = await hre.ethers.provider.getSigner().getAddress()
            
            console.log(`\nTransfer ${i + 1}: ${hre.ethers.utils.formatEther(amount)} TASSET`)
            
            // Check if we have enough balance
            const currentBalance = await assetOFT.balanceOf(recipient)
            if (currentBalance.lt(amount)) {
                console.log(`Insufficient balance. Required: ${hre.ethers.utils.formatEther(amount)}, Available: ${hre.ethers.utils.formatEther(currentBalance)}`)
                continue
            }
            
            const sendParam = {
                dstEid: dstEid,
                to: hre.ethers.utils.zeroPad(recipient, 32),
                amountLD: amount,
                minAmountLD: amount,
                extraOptions: '0x',
                composeMsg: '0x',
                oftCmd: '0x'
            }
            
            const quote = await assetOFT.quoteSend(sendParam, false)
            console.log(`Fee required: ${hre.ethers.utils.formatEther(quote.nativeFee)} ETH`)
            
            const balanceBefore = await hre.ethers.provider.getSigner().getBalance()
            if (balanceBefore.lt(quote.nativeFee)) {
                console.log(`Insufficient ETH for fees. Required: ${hre.ethers.utils.formatEther(quote.nativeFee)}, Available: ${hre.ethers.utils.formatEther(balanceBefore)}`)
                continue
            }
            
            const tx = await assetOFT.send(
                sendParam,
                { nativeFee: quote.nativeFee, lzTokenFee: 0 },
                recipient,
                { value: quote.nativeFee }
            )
            
            const receipt = await tx.wait()
            console.log(`Transfer successful - Gas used: ${receipt.gasUsed}, TX: ${tx.hash}`)
            
            // Verify balance change
            const newBalance = await assetOFT.balanceOf(recipient)
            const actualTransferred = currentBalance.sub(newBalance)
            console.log(`Actual transferred: ${hre.ethers.utils.formatEther(actualTransferred)} TASSET`)
            
            // Small delay between transfers
            await new Promise(resolve => setTimeout(resolve, 2000))
        }
        
    } catch (error) {
        console.log(`Asset OFT transfer test failed: ${error}`)
    }
}

async function testShareOFTTransfer(hre: any, contracts: any, dstEid: number, remoteName: string, isAdapter: boolean) {
    console.log(`\n--- Test 2: Share ${isAdapter ? 'Adapter' : 'OFT'} Cross-Chain Transfer ---`)
    
    try {
        let shareContract: any
        
        if (isAdapter) {
            const ShareAdapter = await hre.ethers.getContractFactory('MyShareOFTAdapter')
            shareContract = ShareAdapter.attach(contracts.MyShareOFTAdapter)
        } else {
            const ShareOFT = await hre.ethers.getContractFactory('MyShareOFT')
            shareContract = ShareOFT.attach(contracts.MyShareOFT)
        }
        
        const recipient = await hre.ethers.provider.getSigner().getAddress()
        
        // For share adapter, we need to check the underlying vault token balance
        if (isAdapter) {
            // Get the vault address that the adapter wraps
            const vaultAddress = await shareContract.token()
            const Vault = await hre.ethers.getContractFactory('MyERC4626')
            const vault = Vault.attach(vaultAddress)
            const shareBalance = await vault.balanceOf(recipient)
            
            console.log(`Share Balance (via vault): ${hre.ethers.utils.formatEther(shareBalance)} TVS`)
            
            if (shareBalance.eq(0)) {
                console.log('No shares to transfer. Skipping share transfer test.')
                return
            }
            
            // Test transferring 10% of shares
            const transferAmount = shareBalance.div(10)
            
            if (transferAmount.gt(0)) {
                // First approve the adapter to spend vault shares
                const approveTx = await vault.connect(await hre.ethers.provider.getSigner()).approve(shareContract.address, transferAmount)
                await approveTx.wait()
                
                const sendParam = {
                    dstEid: dstEid,
                    to: hre.ethers.utils.zeroPad(recipient, 32),
                    amountLD: transferAmount,
                    minAmountLD: transferAmount,
                    extraOptions: '0x',
                    composeMsg: '0x',
                    oftCmd: '0x'
                }
                
                const quote = await shareContract.quoteSend(sendParam, false)
                console.log(`Share transfer fee: ${hre.ethers.utils.formatEther(quote.nativeFee)} ETH`)
                
                const tx = await shareContract.send(
                    sendParam,
                    { nativeFee: quote.nativeFee, lzTokenFee: 0 },
                    recipient,
                    { value: quote.nativeFee }
                )
                
                const receipt = await tx.wait()
                console.log(`Share transfer successful - Gas: ${receipt.gasUsed}, Amount: ${hre.ethers.utils.formatEther(transferAmount)} TVS`)
            }
        } else {
            // Direct share OFT balance check
            const shareBalance = await shareContract.balanceOf(recipient)
            
            console.log(`Share Balance: ${hre.ethers.utils.formatEther(shareBalance)} TVS`)
            
            if (shareBalance.eq(0)) {
                console.log('No shares to transfer. Skipping share transfer test.')
                return
            }
            
            // Test transferring 10% of shares
            const transferAmount = shareBalance.div(10)
            
            if (transferAmount.gt(0)) {
                const sendParam = {
                    dstEid: dstEid,
                    to: hre.ethers.utils.zeroPad(recipient, 32),
                    amountLD: transferAmount,
                    minAmountLD: transferAmount,
                    extraOptions: '0x',
                    composeMsg: '0x',
                    oftCmd: '0x'
                }
                
                const quote = await shareContract.quoteSend(sendParam, false)
                console.log(`Share transfer fee: ${hre.ethers.utils.formatEther(quote.nativeFee)} ETH`)
                
                const tx = await shareContract.send(
                    sendParam,
                    { nativeFee: quote.nativeFee, lzTokenFee: 0 },
                    recipient,
                    { value: quote.nativeFee }
                )
                
                const receipt = await tx.wait()
                console.log(`Share transfer successful - Gas: ${receipt.gasUsed}, Amount: ${hre.ethers.utils.formatEther(transferAmount)} TVS`)
            }
        }
        
    } catch (error) {
        console.log(`Share transfer test failed: ${error}`)
    }
}

async function testBatchTransfers(hre: any, contracts: any, dstEid: number, remoteName: string) {
    console.log(`\n--- Test 3: Batch Transfer Performance ---`)
    
    try {
        const AssetOFT = await hre.ethers.getContractFactory('MyAssetOFT')
        const assetOFT = AssetOFT.attach(contracts.MyAssetOFT)
        
        const recipient = await hre.ethers.provider.getSigner().getAddress()
        const balance = await assetOFT.balanceOf(recipient)
        
        if (balance.lt(hre.ethers.utils.parseEther('3'))) {
            console.log('Insufficient balance for batch transfer test')
            return
        }
        
        // Test multiple small transfers in sequence
        const batchSize = 3
        const batchAmount = hre.ethers.utils.parseEther('0.5')
        const gasUsed = []
        const fees = []
        
        console.log(`Performing ${batchSize} transfers of ${hre.ethers.utils.formatEther(batchAmount)} TASSET each`)
        
        for (let i = 0; i < batchSize; i++) {
            const sendParam = {
                dstEid: dstEid,
                to: hre.ethers.utils.zeroPad(recipient, 32),
                amountLD: batchAmount,
                minAmountLD: batchAmount,
                extraOptions: '0x',
                composeMsg: '0x',
                oftCmd: '0x'
            }
            
            const quote = await assetOFT.quoteSend(sendParam, false)
            fees.push(quote.nativeFee)
            
            const tx = await assetOFT.send(
                sendParam,
                { nativeFee: quote.nativeFee, lzTokenFee: 0 },
                recipient,
                { value: quote.nativeFee }
            )
            
            const receipt = await tx.wait()
            gasUsed.push(receipt.gasUsed)
            
            console.log(`Batch ${i + 1}: Gas ${receipt.gasUsed}, Fee ${hre.ethers.utils.formatEther(quote.nativeFee)} ETH`)
            
            // Delay between transfers
            await new Promise(resolve => setTimeout(resolve, 3000))
        }
        
        // Calculate averages
        const avgGas = gasUsed.reduce((a, b) => a.add(b)).div(gasUsed.length)
        const totalFees = fees.reduce((a, b) => a.add(b))
        
        console.log(`Average gas per transfer: ${avgGas}`)
        console.log(`Total fees for batch: ${hre.ethers.utils.formatEther(totalFees)} ETH`)
        
    } catch (error) {
        console.log(`Batch transfer test failed: ${error}`)
    }
}

async function testQuoteAccuracy(hre: any, contracts: any, dstEid: number, remoteName: string) {
    console.log(`\n--- Test 4: Quote Accuracy Test ---`)
    
    try {
        const AssetOFT = await hre.ethers.getContractFactory('MyAssetOFT')
        const assetOFT = AssetOFT.attach(contracts.MyAssetOFT)
        
        const recipient = await hre.ethers.provider.getSigner().getAddress()
        const testAmounts = [
            hre.ethers.utils.parseEther('0.01'),
            hre.ethers.utils.parseEther('1'),
            hre.ethers.utils.parseEther('100')
        ]
        
        console.log('Testing quote accuracy for different amounts:')
        
        for (const amount of testAmounts) {
            const sendParam = {
                dstEid: dstEid,
                to: hre.ethers.utils.zeroPad(recipient, 32),
                amountLD: amount,
                minAmountLD: amount,
                extraOptions: '0x',
                composeMsg: '0x',
                oftCmd: '0x'
            }
            
            // Get quote multiple times to check consistency
            const quote1 = await assetOFT.quoteSend(sendParam, false)
            await new Promise(resolve => setTimeout(resolve, 1000))
            const quote2 = await assetOFT.quoteSend(sendParam, false)
            
            const isConsistent = quote1.nativeFee.eq(quote2.nativeFee)
            
            console.log(`Amount: ${hre.ethers.utils.formatEther(amount)} TASSET`)
            console.log(`  Quote 1: ${hre.ethers.utils.formatEther(quote1.nativeFee)} ETH`)
            console.log(`  Quote 2: ${hre.ethers.utils.formatEther(quote2.nativeFee)} ETH`)
            console.log(`  Consistent: ${isConsistent}`)
        }
        
    } catch (error) {
        console.log(`Quote accuracy test failed: ${error}`)
    }
}

async function testPeerConfiguration(hre: any, contracts: any, dstEid: number, remoteName: string) {
    console.log(`\n--- Test 5: Peer Configuration Verification ---`)
    
    try {
        const AssetOFT = await hre.ethers.getContractFactory('MyAssetOFT')
        const assetOFT = AssetOFT.attach(contracts.MyAssetOFT)
        
        // Check if peer is set
        const peer = await assetOFT.peers(dstEid)
        const isPeerSet = peer !== '0x0000000000000000000000000000000000000000000000000000000000000000'
        
        console.log(`Checking peer configuration for ${remoteName} (EID: ${dstEid})`)
        console.log(`Peer address: ${peer}`)
        console.log(`Peer is set: ${isPeerSet}`)
        
        if (!isPeerSet) {
            console.log('WARNING: Peer not configured. Cross-chain transfers will fail.')
            console.log('Run: npx hardhat run scripts/set-peers.ts --network ' + hre.network.name)
        }
        
        // Check enforced options
        try {
            const enforcedOptions = await assetOFT.enforcedOptions(dstEid, 1)
            const hasEnforcedOptions = enforcedOptions !== '0x'
            
            console.log(`Enforced options: ${enforcedOptions}`)
            console.log(`Has enforced options: ${hasEnforcedOptions}`)
            
            if (!hasEnforcedOptions) {
                console.log('INFO: No enforced options set. Consider running set-enforced-options.ts for better reliability.')
            }
        } catch (error) {
            console.log(`Could not check enforced options: ${error}`)
        }
        
        // Check endpoint
        const endpoint = await assetOFT.endpoint()
        console.log(`LayerZero Endpoint: ${endpoint}`)
        
        // Check OFT version
        const oftVersion = await assetOFT.oftVersion()
        console.log(`OFT Version: ${oftVersion}`)
        
    } catch (error) {
        console.log(`Peer configuration test failed: ${error}`)
    }
}

testCrossChainTransfer()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error:', error)
        process.exit(1)
    }) 