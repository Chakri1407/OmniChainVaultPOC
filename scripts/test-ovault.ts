import { HardhatRuntimeEnvironment } from 'hardhat/types'

async function main() {
    const hre: HardhatRuntimeEnvironment = require('hardhat')
    console.log('Starting OVault Functionality Tests on Holesky...\n')

    // Get signers
    const [deployer] = await hre.ethers.getSigners()
    console.log(`Deployer: ${deployer.address}\n`)

    // Holesky Deployed Contract Addresses
    const ASSET_OFT = "0x30647974468D019eb455FA0c14Ba85cCd7C46427"
    const VAULT = "0xed551eC80eCF9F59941D65B3474b4b7B4EA4f152"
    const SHARE_ADAPTER = "0x3Cb670dcb1da1d492BE5Ff8352F1D94F551E5F37"
    const SHARE_OFT = "0xa4d30c2012Cea88c81e4b291dD689D5250a8fB11"
    const COMPOSER = "0x3D25e66FC7AeA970A2d4AeFD0042F47b41373Ce1"

    // Get contract instances
    const AssetOFT = await hre.ethers.getContractFactory('MyAssetOFT')
    const assetOFT = AssetOFT.attach(ASSET_OFT)
    
    const Vault = await hre.ethers.getContractFactory('MyERC4626')
    const vault = Vault.attach(VAULT)
    
    const ShareAdapter = await hre.ethers.getContractFactory('MyShareOFTAdapter')
    const shareAdapter = ShareAdapter.attach(SHARE_ADAPTER)
    
    const ShareOFT = await hre.ethers.getContractFactory('MyShareOFT')
    const shareOFT = ShareOFT.attach(SHARE_OFT)
    
    const Composer = await hre.ethers.getContractFactory('MyOVaultComposer')
    const composer = Composer.attach(COMPOSER)

    console.log('Contract instances loaded\n')

    // Test 1: Check initial balances
    console.log('Test 1: Checking initial balances...')
    const deployerAssetBalance = await assetOFT.balanceOf(deployer.address)
    const deployerShareBalance = await vault.balanceOf(deployer.address)
    const vaultTotalAssets = await vault.totalAssets()
    const vaultTotalSupply = await vault.totalSupply()

    console.log(`   Deployer Asset Balance: ${hre.ethers.utils.formatEther(deployerAssetBalance)} TASSET`)
    console.log(`   Deployer Share Balance: ${hre.ethers.utils.formatEther(deployerShareBalance)} TVS`)
    console.log(`   Vault Total Assets: ${hre.ethers.utils.formatEther(vaultTotalAssets)} TASSET`)
    console.log(`   Vault Total Supply: ${hre.ethers.utils.formatEther(vaultTotalSupply)} TVS`)

    // Test 2: Mint additional tokens for testing
    console.log('\nTest 2: Minting additional test assets...')
    const mintAmount = hre.ethers.utils.parseEther('1000')
    
    try {
        const tx = await assetOFT.connect(deployer).mint(deployer.address, mintAmount)
        await tx.wait()
        console.log(`   Minted ${hre.ethers.utils.formatEther(mintAmount)} TASSET to deployer`)
        
        const newBalance = await assetOFT.balanceOf(deployer.address)
        console.log(`   New balance: ${hre.ethers.utils.formatEther(newBalance)} TASSET`)
    } catch (error) {
        console.log(`   Mint failed: ${error}`)
    }

    // Test 3: Direct vault deposit
    console.log('\nTest 3: Direct vault deposit...')
    const depositAmount = hre.ethers.utils.parseEther('100')
    
    // Check allowance first
    const currentAllowance = await assetOFT.allowance(deployer.address, vault.address)
    console.log(`   Current allowance: ${hre.ethers.utils.formatEther(currentAllowance)} TASSET`)
    
    // Approve vault to spend assets
    const approveTx = await assetOFT.connect(deployer).approve(vault.address, depositAmount)
    await approveTx.wait()
    console.log(`   Approved ${hre.ethers.utils.formatEther(depositAmount)} TASSET for vault`)

    // Calculate expected shares
    const expectedShares = await vault.previewDeposit(depositAmount)
    console.log(`   Expected shares: ${hre.ethers.utils.formatEther(expectedShares)} TVS`)

    // Perform deposit
    const depositTx = await vault.connect(deployer).deposit(depositAmount, deployer.address)
    const receipt = await depositTx.wait()
    console.log(`   Deposited ${hre.ethers.utils.formatEther(depositAmount)} TASSET`)
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`)

    // Check balances after deposit
    const newDeployerAssetBalance = await assetOFT.balanceOf(deployer.address)
    const newDeployerShareBalance = await vault.balanceOf(deployer.address)
    const newVaultTotalAssets = await vault.totalAssets()
    const newVaultTotalSupply = await vault.totalSupply()

    console.log(`   Post-deposit Asset Balance: ${hre.ethers.utils.formatEther(newDeployerAssetBalance)} TASSET`)
    console.log(`   Post-deposit Share Balance: ${hre.ethers.utils.formatEther(newDeployerShareBalance)} TVS`)
    console.log(`   Vault Total Assets: ${hre.ethers.utils.formatEther(newVaultTotalAssets)} TASSET`)
    console.log(`   Vault Total Supply: ${hre.ethers.utils.formatEther(newVaultTotalSupply)} TVS`)

    // Test 4: Share price calculation
    console.log('\nTest 4: Share price calculations...')
    const assetsPerShare = await vault.convertToAssets(hre.ethers.utils.parseEther('1'))
    const sharesPerAsset = await vault.convertToShares(hre.ethers.utils.parseEther('1'))
    
    console.log(`   Assets per 1 share: ${hre.ethers.utils.formatEther(assetsPerShare)} TASSET`)
    console.log(`   Shares per 1 asset: ${hre.ethers.utils.formatEther(sharesPerAsset)} TVS`)

    // Test 5: Vault withdrawal
    console.log('\nTest 5: Vault withdrawal (redeem half)...')
    const currentShares = await vault.balanceOf(deployer.address)
    const withdrawAmount = currentShares.div(2) // Withdraw half
    const expectedAssets = await vault.previewRedeem(withdrawAmount)
    
    console.log(`   Redeeming ${hre.ethers.utils.formatEther(withdrawAmount)} TVS`)
    console.log(`   Expected assets: ${hre.ethers.utils.formatEther(expectedAssets)} TASSET`)

    const withdrawTx = await vault.connect(deployer).redeem(withdrawAmount, deployer.address, deployer.address)
    const withdrawReceipt = await withdrawTx.wait()
    console.log(`   Withdrawal completed`)
    console.log(`   Gas used: ${withdrawReceipt.gasUsed.toString()}`)

    // Final balances
    const finalDeployerAssetBalance = await assetOFT.balanceOf(deployer.address)
    const finalDeployerShareBalance = await vault.balanceOf(deployer.address)
    const finalVaultTotalAssets = await vault.totalAssets()
    const finalVaultTotalSupply = await vault.totalSupply()

    console.log(`   Final Asset Balance: ${hre.ethers.utils.formatEther(finalDeployerAssetBalance)} TASSET`)
    console.log(`   Final Share Balance: ${hre.ethers.utils.formatEther(finalDeployerShareBalance)} TVS`)
    console.log(`   Final Vault Assets: ${hre.ethers.utils.formatEther(finalVaultTotalAssets)} TASSET`)
    console.log(`   Final Vault Supply: ${hre.ethers.utils.formatEther(finalVaultTotalSupply)} TVS`)

    // Test 6: OFT capabilities and LayerZero info
    console.log('\nTest 6: LayerZero OFT Information...')
    try {
        const assetOftVersion = await assetOFT.oftVersion()
        const shareAdapterOftVersion = await shareAdapter.oftVersion()
        const shareOftVersion = await shareOFT.oftVersion()
        
        console.log(`   Asset OFT Version: ${assetOftVersion}`)
        console.log(`   Share Adapter OFT Version: ${shareAdapterOftVersion}`)
        console.log(`   Share OFT Version: ${shareOftVersion}`)
        
        // Get endpoint info
        const assetEndpoint = await assetOFT.endpoint()
        const shareEndpoint = await shareOFT.endpoint()
        console.log(`   LayerZero Endpoint: ${assetEndpoint}`)
        console.log(`   Share Endpoint: ${shareEndpoint}`)
        
        // Get wrapped token from adapter
        const wrappedToken = await shareAdapter.token()
        console.log(`   Share Adapter wraps: ${wrappedToken}`)
        console.log(`   Expected vault address: ${vault.address}`)
        console.log(`   Adapter matches vault: ${wrappedToken.toLowerCase() === vault.address.toLowerCase()}`)
        
        console.log(`   OFT contracts ready for cross-chain operations`)
    } catch (error) {
        console.log(`   Could not fetch OFT info: ${error}`)
    }

    console.log('\nHolesky Tests Completed Successfully!')
    console.log('\nNext Steps:')
    console.log('1. Single-chain vault operations working')
    console.log('2. Deploy to Amoy testnet')
    console.log('3. Configure LayerZero peers between chains')
    console.log('4. Test cross-chain asset/share transfers')
    console.log('5. Test cross-chain vault operations via Composer')
    
    console.log('\nCurrent Contract Summary:')
    console.log(`Holesky (Hub Chain):`)
    console.log(`  Asset OFT: ${ASSET_OFT}`)
    console.log(`  Vault: ${VAULT}`)
    console.log(`  Share Adapter: ${SHARE_ADAPTER}`)
    console.log(`  Share OFT: ${SHARE_OFT}`)
    console.log(`  Composer: ${COMPOSER}`)
}

main()
    .then(() => {
        console.log('Test completed successfully')
        process.exit(0)
    })
    .catch((error) => {
        console.error('Test failed:', error)
        process.exit(1)
    }) 