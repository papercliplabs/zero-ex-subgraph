import { PairCreated as PairCreatedEvent } from "../../generated/UniswapV2Factory/UniswapV2FactoryLike";
import { Swap as SwapEvent } from "../../generated/templates/UniswapV2PairLike/UniswapV2PairLike";

export function handlePairCreated(event: PairCreatedEvent): void {
    // For all uniswap v2 like: uniswapV2, sushiSwap, pancakeSwap
}

export function handleSwap(event: SwapEvent): void {
    // For all uniswap v2 like: uniswapV2, sushiSwap, pancakeSwap
}
