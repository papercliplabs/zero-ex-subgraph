import { Address, dataSource, log } from "@graphprotocol/graph-ts";
import { ZERO_ADDRESS } from "./constants";

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
