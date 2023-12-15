import { PoolCreated as PoolCreatedEvent } from "../../generated/UniswapV3Factory/UniswapV3Factory";
import { Swap as SwapEvent } from "../../generated/templates/UniswapV3Pool/UniswapV3Pool";

export function handlePoolCreated(event: PoolCreatedEvent): void {}

export function handleSwap(event: SwapEvent): void {}
