import { Address, dataSource, log } from "@graphprotocol/graph-ts";
import { ZERO_ADDRESS } from "./constants";
// import networks from "../../networks.json";

namespace SupportedChain {
    export const MAINNET = "mainnet";
    export const OPTIMISM = "optimism";
}

const zeroExProxyAddress = new Map<string, Address>()
    .set(SupportedChain.MAINNET, Address.fromString("0xdef1c0ded9bec7f1a1670819833240f027b25eff"))
    .set(SupportedChain.OPTIMISM, Address.fromString("0xdef1abe32c034e558cdd535791643c58a13acc10"))
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
