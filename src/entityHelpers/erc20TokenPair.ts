import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import { Erc20TokenPair, Erc20TokenPairMetrics } from "../../generated/schema";
import { getOrCreateErc20Token } from "./erc20Token";
import { ONE_BD, ONE_BI, ZERO_BD, ZERO_BI } from "../common/constants";
import { bigDecimalSafeDiv, formatUnits } from "../common/utils";

export function getOrCreateErc20TokenPair(
    token0Address: Address,
    token1Address: Address,
    event: ethereum.Event
): Erc20TokenPair {
    if (token0Address.equals(token1Address)) {
        log.error("Same address in getOrCreateErc20TokenPair: {}", [token0Address.toHexString()]);
    }

    // Make it so the order of token0 and token1 don't matter
    const token0IsA = token0Address.toHexString() < token1Address.toHexString();
    const tokenAAddress = token0IsA ? token0Address : token1Address;
    const tokenBAddress = token0IsA ? token1Address : token0Address;
    const id = tokenAAddress.concat(tokenBAddress);

    let pair = Erc20TokenPair.load(id);

    if (!pair) {
        pair = new Erc20TokenPair(id);

        pair.tokenA = getOrCreateErc20Token(tokenAAddress, event).id;
        pair.tokenB = getOrCreateErc20Token(tokenBAddress, event).id;

        const metrics = new Erc20TokenPairMetrics(id);

        metrics.volumeAtoB = ZERO_BI;
        metrics.volumeBtoA = ZERO_BI;

        metrics.fillCountAtoB = ZERO_BI;
        metrics.fillCountBtoA = ZERO_BI;

        metrics.exchangeRateAtoB = ZERO_BD;
        metrics.exchangeRateBtoA = ZERO_BD;
        metrics.save();

        pair.metrics = metrics.id;
        pair.lastUpdatedBlock = event.block.number;

        pair.save();
    }

    return pair;
}

export function updateErc20TokenPairMetrics(
    inputTokenAddress: Address,
    inputTokenAmount: BigInt,
    outputTokenAddress: Address,
    outputTokenAmount: BigInt,
    event: ethereum.Event
): void {
    const pair = getOrCreateErc20TokenPair(inputTokenAddress, outputTokenAddress, event);
    const metrics = Erc20TokenPairMetrics.load(pair.metrics)!; // Guaranteed to exist
    const inputToken = getOrCreateErc20Token(inputTokenAddress, event);
    const outputToken = getOrCreateErc20Token(outputTokenAddress, event);

    const exchangeRateInputToOutput = bigDecimalSafeDiv(
        formatUnits(outputTokenAmount, outputToken.decimals),
        formatUnits(inputTokenAmount, inputToken.decimals)
    );
    const exchangeRateOutputToInput = bigDecimalSafeDiv(ONE_BD, exchangeRateInputToOutput);

    if (Address.fromBytes(pair.tokenA).equals(inputTokenAddress)) {
        metrics.volumeAtoB = metrics.volumeAtoB.plus(inputTokenAmount);
        metrics.fillCountAtoB = metrics.fillCountAtoB.plus(ONE_BI);

        metrics.exchangeRateAtoB = exchangeRateInputToOutput;
        metrics.exchangeRateBtoA = exchangeRateOutputToInput;
    } else {
        metrics.volumeBtoA = metrics.volumeBtoA.plus(inputTokenAmount);
        metrics.fillCountBtoA = metrics.fillCountAtoB.plus(ONE_BI);

        metrics.exchangeRateBtoA = exchangeRateInputToOutput;
        metrics.exchangeRateAtoB = exchangeRateOutputToInput;
    }

    pair.lastUpdatedBlock = event.block.number;

    metrics.save();
    pair.save();

    // Create snapshots
    createErc20PairMetricsSnapshotsIfNecessary(metrics, event);
}

function createErc20PairMetricsSnapshotsIfNecessary(metrics: Erc20TokenPairMetrics, event: ethereum.Event): void {
    // TODO
}
