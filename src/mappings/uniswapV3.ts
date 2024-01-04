import { PoolCreated as PoolCreatedEvent } from "../../generated/UniswapV3Factory/UniswapV3Factory";
import {
    Swap as SwapEvent,
    UniswapV3Pool as UniswapV3PoolContract,
} from "../../generated/templates/UniswapV3Pool/UniswapV3Pool";
import { Address, log } from "@graphprotocol/graph-ts";
import { Erc20FillType, ZERO_ADDRESS, ZERO_BI } from "../common/constants";
import { createErc20Fill } from "../entityHelpers/erc20Fill";
import { findMatchingErc20Transfer } from "../common/utils";
import { getWrappedNativeAssetAddress } from "../common/networkSpecific";
import { UniswapV3Pool } from "../../generated/templates";

export function handlePoolCreated(event: PoolCreatedEvent): void {
    // Spawn dynamic data source
    // TODO: undo comment below, just for optimized indexing
    // UniswapV3Pool.create(event.params.pool);
}

const ZERO_EX_PROXY_ADDRESS = Address.fromString("0xdef1c0ded9bec7f1a1670819833240f027b25eff");

export function handleSwap(event: SwapEvent): void {
    // TODO: removed for now to benchmark
    // if (event.params.sender.notEqual(getZeroExProxyAddress())) {
    if (event.params.sender.notEqual(ZERO_EX_PROXY_ADDRESS)) {
        // Only care about swap from 0x
        return;
    } else {
        const uniswapV3PoolContract = UniswapV3PoolContract.bind(event.address);
        const token0Address = uniswapV3PoolContract.token0();
        const token1Address = uniswapV3PoolContract.token1();

        const token0Input = event.params.amount0.gt(ZERO_BI);

        const inputTokenAddress = token0Input ? token0Address : token1Address;
        const inputTokenAmount = token0Input ? event.params.amount0.abs() : event.params.amount1.abs();

        const outputTokenAddress = token0Input ? token1Address : token0Address;
        const outputTokenAmount = token0Input ? event.params.amount1.abs() : event.params.amount0.abs();

        const inputTransfer = findMatchingErc20Transfer(
            inputTokenAddress,
            inputTokenAmount,
            null,
            event.address,
            event
        );

        // From 0x, all transfers into the pools for optimized swaps will be in ERC20 tokens only (wraps / unwraps happen in zeroExProxy). So, this should never fail to find the sender
        const sender = inputTransfer ? Address.fromBytes(inputTransfer.from) : ZERO_ADDRESS; // If all else fails, leave empty...

        createErc20Fill(
            Erc20FillType.OptimizedUniswapV3,
            sender,
            event.address, // this pool is filler
            event.params.recipient,
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
            log.warning("Unable to find sender for uniswapV3.handleSwap: {} - {}", [
                event.transaction.hash.toHexString(),
                event.logIndex.toString(),
            ]);
        }
    }
}
