import { PairCreated as PairCreatedEvent } from "../../generated/UniswapV2Factory/UniswapV2FactoryLike";
import { Swap as SwapEvent } from "../../generated/templates/UniswapV2PairLike/UniswapV2PairLike";
import { DataSourceContext, dataSource, log } from "@graphprotocol/graph-ts";
import { getZeroExProxyAddress } from "../common/networkSpecific";
import { UniswapV2PairLike } from "../../generated/templates";
import { Erc20FillType } from "../common/constants";

export function handleUniswapV2PairCreated(event: PairCreatedEvent): void {
    // Spawn dynamic data source
    let context = new DataSourceContext();
    context.setString("fillType", Erc20FillType.OptimizedUniswapV2);
    UniswapV2PairLike.createWithContext(event.params.pair, context);
}

export function handleSushiSwapPairCreated(event: PairCreatedEvent): void {
    // Spawn dynamic data source
    let context = new DataSourceContext();
    context.setString("fillType", Erc20FillType.OptimizedSushiSwap);
    UniswapV2PairLike.createWithContext(event.params.pair, context);
}

export function handlePancakeSwapPairCreated(event: PairCreatedEvent): void {
    // Spawn dynamic data source
    let context = new DataSourceContext();
    context.setString("fillType", Erc20FillType.OptimizedPancakeSwap);
    UniswapV2PairLike.createWithContext(event.params.pair, context);
}

// All v2 like share the same handler, use context to know which it is
export function handleSwap(event: SwapEvent): void {
    if (event.params.sender != getZeroExProxyAddress()) {
        // Only care about swap from 0x
        return;
    } else {
        let context = dataSource.context();
        let fillType = context.getString("fillType");
        log.info("Zero ex v2 like swap: {}, {}", [event.address.toHexString(), fillType]);
    }
}
