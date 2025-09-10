import { EndpointId } from '@layerzerolabs/lz-definitions'

// Contract addresses - UPDATE THESE WITH YOUR DEPLOYED ADDRESSES
const HOLESKY_CONTRACTS = {
    MyAssetOFT: '0x30647974468D019eb455FA0c14Ba85cCd7C46427',
    MyShareOFTAdapter: '0x3Cb670dcb1da1d492BE5Ff8352F1D94F551E5F37',
    MyShareOFT: '0xa4d30c2012Cea88c81e4b291dD689D5250a8fB11',
}

const AMOY_CONTRACTS = {
    MyAssetOFT: 'YOUR_AMOY_ASSET_OFT_ADDRESS',
    MyShareOFTAdapter: 'YOUR_AMOY_SHARE_ADAPTER_ADDRESS', 
    MyShareOFT: 'YOUR_AMOY_SHARE_OFT_ADDRESS',
}

// Asset OFT Configuration
const holeskyAssetOFT = {
    eid: EndpointId.HOLESKY_V2_TESTNET,
    contractName: 'MyAssetOFT',
    address: HOLESKY_CONTRACTS.MyAssetOFT,
}

const amoyAssetOFT = {
    eid: EndpointId.AMOY_V2_TESTNET,
    contractName: 'MyAssetOFT', 
    address: AMOY_CONTRACTS.MyAssetOFT,
}

// Share OFT Configuration
const holeskyShareOFTAdapter = {
    eid: EndpointId.HOLESKY_V2_TESTNET,
    contractName: 'MyShareOFTAdapter',
    address: HOLESKY_CONTRACTS.MyShareOFTAdapter,
}

const amoyShareOFT = {
    eid: EndpointId.AMOY_V2_TESTNET,
    contractName: 'MyShareOFT',
    address: AMOY_CONTRACTS.MyShareOFT,
}

export default {
    contracts: [
        // Asset OFT contracts
        {
            contract: holeskyAssetOFT,
        },
        {
            contract: amoyAssetOFT,
        },
        // Share OFT contracts  
        {
            contract: holeskyShareOFTAdapter,
        },
        {
            contract: amoyShareOFT,
        },
    ],
    connections: [
        // Asset OFT connections
        {
            from: holeskyAssetOFT,
            to: amoyAssetOFT,
            config: {
                sendLibrary: '0x0000000000000000000000000000000000000000',
                receiveLibrary: '0x0000000000000000000000000000000000000000',
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        executor: '0x0000000000000000000000000000000000000000'
                    },
                    ulnConfig: {
                        confirmations: 15,
                        requiredDVNs: [],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0
                    }
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: 15,
                        requiredDVNs: [],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0
                    }
                }
            }
        },
        {
            from: amoyAssetOFT,
            to: holeskyAssetOFT,
            config: {
                sendLibrary: '0x0000000000000000000000000000000000000000',
                receiveLibrary: '0x0000000000000000000000000000000000000000',
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        executor: '0x0000000000000000000000000000000000000000'
                    },
                    ulnConfig: {
                        confirmations: 15,
                        requiredDVNs: [],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0
                    }
                },
                receiveConfig: {
                    ulnConfig: {
                        confirmations: 15,
                        requiredDVNs: [],
                        optionalDVNs: [],
                        optionalDVNThreshold: 0
                    }
                }
            }
        },
        // Share OFT connections
        {
            from: holeskyShareOFTAdapter,
            to: amoyShareOFT,
        },
        {
            from: amoyShareOFT,
            to: holeskyShareOFTAdapter,
        },
    ],
}