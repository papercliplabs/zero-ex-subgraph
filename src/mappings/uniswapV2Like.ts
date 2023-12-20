import { PairCreated as PairCreatedEvent } from "../../generated/UniswapV2Factory/UniswapV2FactoryLike";
import {
    Swap as SwapEvent,
    UniswapV2PairLike as UniswapV2FactoryLikeContract,
} from "../../generated/templates/UniswapV2PairLike/UniswapV2PairLike";
import { Address, DataSourceContext, dataSource, log } from "@graphprotocol/graph-ts";
import { Erc20FillType, ZERO_ADDRESS, ZERO_BI } from "../common/constants";
import { createErc20Fill } from "../entityHelpers/erc20Fill";
import { findMatchingErc20Transfer } from "../common/utils";
import { getWrappedNativeAssetAddress } from "../common/networkSpecific";
import { UniswapV2PairLike } from "../../generated/templates";

export function handleUniswapV2PairCreated(event: PairCreatedEvent): void {
    // Spawn dynamic data source
    let context = new DataSourceContext();
    context.setString("fillType", Erc20FillType.OptimizedUniswapV2);

    // TODO: undo comment below, just for optimized indexing
    // UniswapV2PairLike.createWithContext(event.params.pair, context);
}

export function handleSushiSwapPairCreated(event: PairCreatedEvent): void {
    // Spawn dynamic data source
    let context = new DataSourceContext();
    context.setString("fillType", Erc20FillType.OptimizedSushiSwap);

    // TODO: undo comment below, just for optimized indexing
    // UniswapV2PairLike.createWithContext(event.params.pair, context);
}

export function handlePancakeSwapPairCreated(event: PairCreatedEvent): void {
    // Spawn dynamic data source
    let context = new DataSourceContext();
    context.setString("fillType", Erc20FillType.OptimizedPancakeSwap);

    // TODO: undo comment below, just for optimized indexing
    // UniswapV2PairLike.createWithContext(event.params.pair, context);
}

const ZERO_EX_PROXY_ADDRESS = Address.fromString("0xdef1c0ded9bec7f1a1670819833240f027b25eff");

// All v2 like share the same handler, use context to know which it is
export function handleSwap(event: SwapEvent): void {
    // TODO: removed for now to benchmark
    // if (event.params.sender.notEqual(getZeroExProxyAddress())) {
    if (event.params.sender.notEqual(ZERO_EX_PROXY_ADDRESS)) {
        // Only care about swap from 0x
        return;
    } else {
        let context = dataSource.context();
        let fillType = context.getString("fillType");

        const uniswapV2PairLikeContract = UniswapV2FactoryLikeContract.bind(event.address);
        const token0Address = uniswapV2PairLikeContract.token0();
        const token1Address = uniswapV2PairLikeContract.token1();

        const token0Input = event.params.amount1In.isZero();

        const inputTokenAddress = token0Input ? token0Address : token1Address;
        const inputTokenAmount = token0Input ? event.params.amount0In : event.params.amount1In;

        const outputTokenAddress = token0Input ? token1Address : token0Address;
        const outputTokenAmount = token0Input ? event.params.amount1Out : event.params.amount0Out;

        const inputTransfer = findMatchingErc20Transfer(
            inputTokenAddress,
            inputTokenAmount,
            null,
            event.address,
            event
        );

        // If where we can't find the input transfer and the input asset is WETH, we have an ETH call chain with wrapping: sender -> proxy + wrap ETH -> pool
        // In this case, the sender is txn.from
        const sender = inputTransfer
            ? Address.fromBytes(inputTransfer.from)
            : getWrappedNativeAssetAddress().equals(inputTokenAddress)
            ? event.transaction.from
            : ZERO_ADDRESS; // If all else fails, leave empty...

        createErc20Fill(
            fillType,
            sender,
            event.address, // this pair is filler
            event.params.to,
            inputTokenAddress,
            outputTokenAddress,
            inputTokenAmount,
            outputTokenAmount,
            ZERO_ADDRESS,
            ZERO_BI,
            ZERO_BI,
            "",
            event
        );

        if (ZERO_ADDRESS.equals(sender)) {
            log.warning("Unable to find sender for uniswapV2Like.handleSwap: {} - {}", [
                event.transaction.hash.toHexString(),
                event.logIndex.toString(),
            ]);
        }
    }
}
