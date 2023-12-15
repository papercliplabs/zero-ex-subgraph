import { PoolCreated as PoolCreatedEvent } from "../../generated/UniswapV3Factory/UniswapV3Factory";
import { Swap as SwapEvent } from "../../generated/templates/UniswapV3Pool/UniswapV3Pool";
import { UniswapV3Pool } from "../../generated/templates";
import { getZeroExProxyAddress } from "../common/networkSpecific";
import { log } from "@graphprotocol/graph-ts";

export function handlePoolCreated(event: PoolCreatedEvent): void {
    // Spawn dynamic data source
    UniswapV3Pool.create(event.params.pool);
}

export function handleSwap(event: SwapEvent): void {
    if (event.params.sender != getZeroExProxyAddress()) {
        // Only care about swap from 0x
        return;
    } else {
        log.info("Zero ex v3 swap: {}", [event.address.toHexString()]);
    }
}
