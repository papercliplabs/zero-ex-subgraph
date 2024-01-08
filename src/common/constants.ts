import { Address, BigDecimal, BigInt, ByteArray, Bytes, crypto } from "@graphprotocol/graph-ts";

export const ZERO_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000000");

export const ETH_ADDRESS = Address.fromString("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"); // 0x uses this for ETH

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

export namespace Erc20FillRole {
    export const Source = "Source";
    export const Filler = "Filler";
    export const Destination = "Destination";
}

export namespace UniqueUserUsageId {
    export const Protocol = Bytes.fromI32(0);
    export const Erc20FillSummary = Bytes.fromI32(1);
}

export namespace NftCollectionType {
    export const Erc721 = "Erc721";
    export const Erc1155 = "Erc1155";
}

export namespace NftFillDirection {
    export const Sell = "SELL";
    export const Buy = "BUY";
}

export const TRANSFER_EVENT_SIGNATURE = crypto.keccak256(ByteArray.fromUTF8("Transfer(address,address,uint256)"));

export const CHAINLINK_PRICE_FEED_FACTOR = BigDecimal.fromString("100000000"); // 10^8

export const ERC1155_INTERFACE_ID = Bytes.fromHexString("0xd9b67a26");

// Indexing params

// If true, will ignore optimized swaps which are quite indexing intensive, this will significantly speed up indexing (at the cost of missing data)
export const EXCLUDE_OPTIMIZED_SWAPS = true;

// If true, will not take historical snapshots, which are indexing intensive,
export const EXCLUDE_HISTORICAL_DATA = false;
