import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deployOVault: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
    const { getNamedAccounts, deployments, network } = hre
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    console.log(`Deploying OVault contracts to ${network.name} with deployer: ${deployer}`)

    // Get LayerZero endpoint for the current network
    const endpointV2Deployment = await deployments.get('EndpointV2')
    const lzEndpoint = endpointV2Deployment.address

    console.log(`Using LayerZero Endpoint: ${lzEndpoint}`)

    // 1. Deploy Asset OFT (underlying token for the vault)
    // First, try the correct contract name - it should be MyAssetOFT if you've updated VaultToken.sol
    console.log('Deploying Asset OFT...')
    const assetOFT = await deploy('MyAssetOFT', {
        from: deployer,
        args: [
            'Test Asset', // name
            'TASSET',     // symbol
            lzEndpoint,   // LayerZero endpoint
            deployer      // delegate/owner
        ],
        log: true,
        waitConfirmations: 1,
    })

    // 2. Deploy ERC4626 Vault
    console.log('Deploying ERC4626 Vault...')
    const vault = await deploy('MyERC4626', {
        from: deployer,
        args: [
            'Test Vault Shares', // name
            'TVS',               // symbol
            assetOFT.address     // underlying asset
        ],
        log: true,
        waitConfirmations: 1,
    })

    // 3. Deploy Share OFT Adapter (for vault shares)
    console.log('Deploying Share OFT Adapter...')
    const shareOFTAdapter = await deploy('MyShareOFTAdapter', {
        from: deployer,
        args: [
            vault.address, // vault shares token
            lzEndpoint,    // LayerZero endpoint
            deployer       // delegate/owner
        ],
        log: true,
        waitConfirmations: 1,
    })

    // 4. Deploy Share OFT (for spoke chains)
    console.log('Deploying Share OFT...')
    const shareOFT = await deploy('MyShareOFT', {
        from: deployer,
        args: [
            'Test Vault Shares OFT', // name
            'TVSOFT',                // symbol
            lzEndpoint,              // LayerZero endpoint
            deployer                 // delegate/owner
        ],
        log: true,
        waitConfirmations: 1,
    })

    // 5. Deploy Vault Composer (orchestration layer)
    console.log('Deploying Vault Composer...')
    const vaultComposer = await deploy('MyOVaultComposer', {
        from: deployer,
        args: [
            vault.address,           // vault contract
            assetOFT.address,        // asset OFT
            shareOFTAdapter.address  // share OFT (using adapter on hub chain)
        ],
        log: true,
        waitConfirmations: 1,
    })

    console.log('\n=== DEPLOYMENT SUMMARY ===')
    console.log(`Network: ${network.name}`)
    console.log(`Deployer: ${deployer}`)
    console.log(`LayerZero Endpoint: ${lzEndpoint}`)
    console.log(`\nDeployed Contracts:`)
    console.log(`📄 Asset OFT: ${assetOFT.address}`)
    console.log(`🏦 ERC4626 Vault: ${vault.address}`)
    console.log(`🔗 Share OFT Adapter: ${shareOFTAdapter.address}`)
    console.log(`📊 Share OFT: ${shareOFT.address}`)
    console.log(`🎼 Vault Composer: ${vaultComposer.address}`)

    // Save deployment addresses for testing
    console.log('\n=== SAVE THESE ADDRESSES FOR TESTING ===')
    console.log(`ASSET_OFT="${assetOFT.address}"`)
    console.log(`VAULT="${vault.address}"`)
    console.log(`SHARE_ADAPTER="${shareOFTAdapter.address}"`)
    console.log(`SHARE_OFT="${shareOFT.address}"`)
    console.log(`COMPOSER="${vaultComposer.address}"`)

    return true
}

deployOVault.tags = ['OVault', 'all']
deployOVault.dependencies = ['EndpointV2']
deployOVault.id = 'deploy_ovault' // Add this line

export default deployOVault 