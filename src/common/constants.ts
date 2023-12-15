import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export const ZERO_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000000");

export const DAYS_PER_YEAR: BigInt = BigInt.fromString("365");
export const SECONDS_PER_HOUR: BigInt = BigInt.fromString("3600");
export const SECONDS_PER_DAY: BigInt = BigInt.fromString("86400");
export const SECONDS_PER_WEEK: BigInt = BigInt.fromString("604800");
export const SECONDS_PER_YEAR: BigInt = BigInt.fromString("31536000");

export const SECONDS_PER_BLOCK: BigInt = BigInt.fromString("12");

export const ZERO_BI: BigInt = BigInt.fromU32(0);
export const ZERO_BD: BigDecimal = BigDecimal.fromString("0");
export const ONE_BI: BigInt = BigInt.fromU32(1);
export const ONE_BD: BigDecimal = BigDecimal.fromString("1");

export namespace Erc20FillType {
    export const LimitOrder = "LimitOrder";
    export const RfqOrder = "RfqOrder";
    export const OtcOrder = "OtcOrder";
    export const BridgeOrder = "BridgeOrder";
    export const PlugableLiquidityProvider = "PlugableLiquidityProvider";
    export const OptimizedUniswapV2 = "OptimizedUniswapV2";
    export const OptimizedSushiSwap = "OptimizedSushiSwap";
    export const OptimizedPancakeSwap = "OptimizedPancakeSwap";
    export const OptimizedUniswapV3 = "OptimizedUniswapV3";
}
