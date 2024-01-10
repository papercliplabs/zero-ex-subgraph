import { Address, dataSource, log } from "@graphprotocol/graph-ts";
import { NATIVE_ADDRESS, ZERO_ADDRESS } from "./constants";

namespace SupportedChain {
    export const MAINNET = "mainnet";
    export const OPTIMISM = "optimism";
    export const ARBITRUM = "arbitrum-one";
    export const BASE = "base";
    export const POLYGON = "matic";
    export const BNB = "bsc";
    export const AVALANCHE = "avalanche";
    export const FANTOM = "fantom";
    export const CELO = "celo";
}

const zeroExProxyAddress = new Map<string, Address>()
    .set(SupportedChain.MAINNET, Address.fromString("0xdef1c0ded9bec7f1a1670819833240f027b25eff"))
    .set(SupportedChain.OPTIMISM, Address.fromString("0xdef1abe32c034e558cdd535791643c58a13acc10"))
    .set(SupportedChain.ARBITRUM, Address.fromString("0xdef1c0ded9bec7f1a1670819833240f027b25eff"))
    .set(SupportedChain.BASE, Address.fromString("0xdef1c0ded9bec7f1a1670819833240f027b25eff"))
    .set(SupportedChain.POLYGON, Address.fromString("0xdef1c0ded9bec7f1a1670819833240f027b25eff"))
    .set(SupportedChain.BNB, Address.fromString("0xdef1c0ded9bec7f1a1670819833240f027b25eff"))
    .set(SupportedChain.AVALANCHE, Address.fromString("0xdef1c0ded9bec7f1a1670819833240f027b25eff"))
    .set(SupportedChain.FANTOM, Address.fromString("0xdef189deaef76e379df891899eb5a00a94cbc250"))
    .set(SupportedChain.CELO, Address.fromString("0xdef1c0ded9bec7f1a1670819833240f027b25eff"))
    .set("fallback", ZERO_ADDRESS);

const flashWalletAddress = new Map<string, Address>()
    .set(SupportedChain.MAINNET, Address.fromString("0x22f9dcf4647084d6c31b2765f6910cd85c178c18"))
    .set(SupportedChain.OPTIMISM, Address.fromString("0xa3128d9b7cca7d5af29780a56abeec12b05a6740"))
    .set(SupportedChain.ARBITRUM, Address.fromString("0xdb6f1920a889355780af7570773609bd8cb1f498"))
    .set(SupportedChain.BASE, Address.fromString("0xdb6f1920a889355780af7570773609bd8cb1f498"))
    .set(SupportedChain.POLYGON, Address.fromString("0xdb6f1920a889355780af7570773609bd8cb1f498"))
    .set(SupportedChain.BNB, Address.fromString("0xdb6f1920a889355780af7570773609bd8cb1f498"))
    .set(SupportedChain.AVALANCHE, Address.fromString("0xdb6f1920a889355780af7570773609bd8cb1f498"))
    .set(SupportedChain.FANTOM, Address.fromString("0xb4d961671cadfed687e040b076eee29840c142e5"))
    .set(SupportedChain.CELO, Address.fromString("0xdb6f1920a889355780af7570773609bd8cb1f498"))
    .set("fallback", ZERO_ADDRESS);

const wrappedNativeAddress = new Map<string, Address>()
    .set(SupportedChain.MAINNET, Address.fromString("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"))
    .set(SupportedChain.OPTIMISM, Address.fromString("0x4200000000000000000000000000000000000006"))
    .set(SupportedChain.ARBITRUM, Address.fromString("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"))
    .set(SupportedChain.BASE, Address.fromString("0x4200000000000000000000000000000000000006"))
    .set(SupportedChain.POLYGON, Address.fromString("0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270")) // WMATIC
    .set(SupportedChain.BNB, Address.fromString("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c")) // WBNB
    .set(SupportedChain.AVALANCHE, Address.fromString("0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7")) // WAVAX
    .set(SupportedChain.FANTOM, Address.fromString("0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83")) // WFTM
    .set(SupportedChain.CELO, NATIVE_ADDRESS) // no WCELO, CELO is native and ERC20
    .set("fallback", ZERO_ADDRESS);

const chainlinkNativeToUsdPriceFeedAddress = new Map<string, Address>()
    .set(SupportedChain.MAINNET, Address.fromString("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419")) // ETH / USD
    .set(SupportedChain.OPTIMISM, Address.fromString("0x13e3Ee699D1909E989722E753853AE30b17e08c5")) // ETH / USD
    .set(SupportedChain.ARBITRUM, Address.fromString("0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612")) // ETH / USD
    .set(SupportedChain.BASE, Address.fromString("0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70")) // ETH / USD
    .set(SupportedChain.POLYGON, Address.fromString("0xAB594600376Ec9fD91F8e885dADF0CE036862dE0")) // MATIC / USD
    .set(SupportedChain.BNB, Address.fromString("0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE")) // BNB / USD
    .set(SupportedChain.AVALANCHE, Address.fromString("0x0A77230d17318075983913bC2145DB16C7366156")) // AVAX / USD
    .set(SupportedChain.FANTOM, Address.fromString("0xf4766552D15AE4d256Ad41B6cf2933482B0680dc")) // FTM / USD
    .set(SupportedChain.CELO, Address.fromString("0x0568fD19986748cEfF3301e55c0eb1E729E0Ab7e")) // CELO / USD
    .set("fallback", ZERO_ADDRESS);

const tokenAddressWhitelist = new Map<string, Address[]>()
    .set(SupportedChain.MAINNET, [
        NATIVE_ADDRESS,
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
    .set(SupportedChain.OPTIMISM, [
        NATIVE_ADDRESS,
        Address.fromString("0x4200000000000000000000000000000000000006"), // WETH
        Address.fromString("0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"), // USDC
        Address.fromString("0x7F5c764cBc14f9669B88837ca1490cCa17c31607"), // USDC.e
        Address.fromString("0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"), // DAI
        Address.fromString("0x94b008aA00579c1307B0EF2c499aD98a8ce58e58"), // USDT
        Address.fromString("0x68f180fcCe6836688e9084f035309E29Bf0A2095"), // WBTC
    ])
    .set(SupportedChain.ARBITRUM, [
        NATIVE_ADDRESS,
        Address.fromString("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"), // WETH
        Address.fromString("0xaf88d065e77c8cC2239327C5EDb3A432268e5831"), // USDC
        Address.fromString("0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8"), // USDC.e
        Address.fromString("0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"), // DAI
        Address.fromString("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"), // USDT
        Address.fromString("0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f"), // WBTC
    ])
    .set(SupportedChain.BASE, [
        NATIVE_ADDRESS,
        Address.fromString("0x4200000000000000000000000000000000000006"), // WETH
        Address.fromString("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"), // USDC
        Address.fromString("0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"), // DAI
        // Address.fromString(""), // USDT
        // Address.fromString(""), // WBTC
    ])
    .set(SupportedChain.POLYGON, [
        NATIVE_ADDRESS,
        Address.fromString("0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"), // WMATIC
        Address.fromString("0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"), // WETH
        Address.fromString("0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"), // USDC
        Address.fromString("0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"), // DAI
        Address.fromString("0xc2132D05D31c914a87C6611C10748AEb04B58e8F"), // USDT
        Address.fromString("0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6"), // WBTC
    ])
    .set(SupportedChain.BNB, [
        NATIVE_ADDRESS,
        Address.fromString("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"), // WBNB
        // Address.fromString(""), // USDC
        // Address.fromString(""), // DAI
        // Address.fromString(""), // USDT
        // Address.fromString(""), // WBTC
    ])
    .set(SupportedChain.AVALANCHE, [
        NATIVE_ADDRESS,
        Address.fromString("0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"), // WAVAX
        Address.fromString("0x50b7545627a5162F82A992c33b87aDc75187B218"), // WETH.e
        Address.fromString("0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E"), // USDC
        Address.fromString("0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664"), // USDC.e
        Address.fromString("0xd586E7F844cEa2F87f50152665BCbc2C279D8d70"), // DAI.e
        Address.fromString("0x50b7545627a5162F82A992c33b87aDc75187B218"), // USDT
        Address.fromString("0x50b7545627a5162F82A992c33b87aDc75187B218"), // WBTC.e
    ])
    .set(SupportedChain.FANTOM, [
        NATIVE_ADDRESS,
        Address.fromString("0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83"), // WFTM
        Address.fromString("0x04068DA6C83AFCFA0e13ba15A6696662335D5B75"), // USDC
        Address.fromString("0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E"), // DAI
        // Address.fromString(""), // USDT
        // Address.fromString(""), // WBTC
    ])
    .set(SupportedChain.CELO, [
        NATIVE_ADDRESS,
        Address.fromString("0x765DE816845861e75A25fCA122bb6898B8B1282a"), // CUSD
        Address.fromString("0x122013fd7dF1C6F636a5bb8f03108E876548b455"), // WETH
        Address.fromString("0xef4229c8c3250C675F21BCefa42f58EfbfF6002a"), // USDC
        Address.fromString("0xE4fE50cdD716522A56204352f00AA110F731932d"), // DAI
        Address.fromString("0x617f3112bf5397D0467D315cC709EF968D9ba546"), // USDT
        Address.fromString("0xBAAB46E28388d2779e6E31Fd00cF0e5Ad95E327B"), // WBTC
    ])
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

export function getWrappedNativeAddress(): Address {
    return getChainSpecificData(wrappedNativeAddress);
}

export function getChainlinkNativeToUsdPriceFeedAddress(): Address {
    return getChainSpecificData(chainlinkNativeToUsdPriceFeedAddress);
}

export function getTokenAddressWhitelist(): Address[] {
    return getChainSpecificData(tokenAddressWhitelist);
}
