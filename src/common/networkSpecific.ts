import { Address, dataSource, log } from "@graphprotocol/graph-ts";
import { ETH_ADDRESS, ZERO_ADDRESS } from "./constants";

namespace SupportedChain {
    export const MAINNET = "mainnet";
    export const OPTIMISM = "optimism";
}

const zeroExProxyAddress = new Map<string, Address>()
    .set(SupportedChain.MAINNET, Address.fromString("0xdef1c0ded9bec7f1a1670819833240f027b25eff"))
    .set(SupportedChain.OPTIMISM, Address.fromString("0xdef1abe32c034e558cdd535791643c58a13acc10"))
    .set("fallback", ZERO_ADDRESS);

const flashWalletAddress = new Map<string, Address>()
    .set(SupportedChain.MAINNET, Address.fromString("0x22f9dcf4647084d6c31b2765f6910cd85c178c18"))
    .set(SupportedChain.OPTIMISM, Address.fromString("0xa3128d9b7cca7d5af29780a56abeec12b05a6740"))
    .set("fallback", ZERO_ADDRESS);

const wrappedNativeAssetAddress = new Map<string, Address>()
    .set(SupportedChain.MAINNET, Address.fromString("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"))
    .set(SupportedChain.OPTIMISM, Address.fromString("0x4200000000000000000000000000000000000006"))
    .set("fallback", ZERO_ADDRESS);

const chainlinkEthToUsdPriceFeedAddress = new Map<string, Address>()
    .set(SupportedChain.MAINNET, Address.fromString("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"))
    .set(SupportedChain.OPTIMISM, Address.fromString("0x13e3Ee699D1909E989722E753853AE30b17e08c5"))
    .set("fallback", ZERO_ADDRESS);

const tokenAddressWhitelist = new Map<string, Address[]>()
    .set(SupportedChain.MAINNET, [
        ETH_ADDRESS, // ETH
        Address.fromString("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"), // WETH
        Address.fromString("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"), // USDC
        Address.fromString("0x6B175474E89094C44Da98b954EedeAC495271d0F"), // DAI
        Address.fromString("0xdAC17F958D2ee523a2206206994597C13D831ec7"), // USDT
        Address.fromString("0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"), // WBTC
        Address.fromString("0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0"), // MATIC
        Address.fromString("0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2"), // MKR
        Address.fromString("0xc00e94cb662c3520282e6f5717214004a7f26888"), // COMP
        Address.fromString("0x514910771af9ca656af840dff83e8264ecf986ca"), // LINK
        Address.fromString("0x111111111117dc0aa78b770fa6a738034120c302"), // 1INCH
        Address.fromString("0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9"), // AAVE
        Address.fromString("0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84"), // stETH
        Address.fromString("0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0"), // wstETH
        Address.fromString("0xc944E90C64B2c07662A292be6244BDf05Cda44a7"), // GRT
        Address.fromString("0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e"), // YFI
        Address.fromString("0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"), // UNI
        Address.fromString("0xae78736Cd615f374D3085123A210448E74Fc6393"), // rETH
        Address.fromString("0xBe9895146f7AF43049ca1c1AE358B0541Ea49704"), // cbETH
        Address.fromString("0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32"), // LDO
        Address.fromString("0xD533a949740bb3306d119CC777fa900bA034cd52"), // CRV
        Address.fromString("0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1"), // ARB
        Address.fromString("0xc5102fE9359FD9a28f877a67E36B0F050d81a3CC"), // HOP
        Address.fromString("0x92D6C1e31e14520e676a687F0a93788B716BEff5"), // DYDX
        Address.fromString("0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F"), // SNX
    ])
    .set(SupportedChain.OPTIMISM, [])
    .set("fallback", []);

/**
 * Get chain specific data from a map
 * @param map
 * @return data for the chain, or the fallback if not supported
 */
function getChainSpecificData<T>(map: Map<string, T>): T {
    const network = dataSource.network();

    if (map.has(network)) {
        return map.get(network);
    } else {
        log.error("getChainSpecificData - unsupported network: {}", [network]);
        return map.get("fallback");
    }
}

export function getZeroExProxyAddress(): Address {
    return getChainSpecificData(zeroExProxyAddress);
}

export function getFlashWalletAddress(): Address {
    return getChainSpecificData(flashWalletAddress);
}

export function getWrappedNativeAssetAddress(): Address {
    return getChainSpecificData(wrappedNativeAssetAddress);
}

export function getChainlinkEthToUsdPriceFeedAddress(): Address {
    return getChainSpecificData(chainlinkEthToUsdPriceFeedAddress);
}

export function getTokenAddressWhitelist(): Address[] {
    return getChainSpecificData(tokenAddressWhitelist);
}
