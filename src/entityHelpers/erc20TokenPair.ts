import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import {
    DailyErc20TokenPairData,
    Erc20TokenPair,
    Erc20TokenPairData,
    WeeklyErc20TokenPairData,
} from "../../generated/schema";
import { getOrCreateErc20Token } from "./erc20Token";
import {
    EXCLUDE_HISTORICAL_DATA,
    ONE_BD,
    ONE_BI,
    SECONDS_PER_DAY,
    SECONDS_PER_HOUR,
    SECONDS_PER_WEEK,
    ZERO_BD,
    ZERO_BI,
} from "../common/constants";
import { bigDecimalSafeDiv, copyEntity, formatUnits } from "../common/utils";
import { getOrCreateProtocol } from "./protocol";

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

        pair._protocol = getOrCreateProtocol(event).id;

        pair.tokenA = getOrCreateErc20Token(tokenAAddress, event).id;
        pair.tokenB = getOrCreateErc20Token(tokenBAddress, event).id;

        const data = new Erc20TokenPairData(id);
        data.pair = pair.id;

        data.volumeAtoB = ZERO_BI;
        data.volumeBtoA = ZERO_BI;

        data.fillCountAtoB = ZERO_BI;
        data.fillCountBtoA = ZERO_BI;

        data.exchangeRateAtoB = ZERO_BD;
        data.exchangeRateBtoA = ZERO_BD;
        data.save();

        pair.data = data.id;
        pair.lastUpdatedBlock = event.block.number;

        pair.save();
    }

    return pair;
}

export function updateErc20TokenPairData(
    inputTokenAddress: Address,
    inputTokenAmount: BigInt,
    outputTokenAddress: Address,
    outputTokenAmount: BigInt,
    event: ethereum.Event
): void {
    const pair = getOrCreateErc20TokenPair(inputTokenAddress, outputTokenAddress, event);
    const data = Erc20TokenPairData.load(pair.data)!; // Guaranteed to exist
    const inputToken = getOrCreateErc20Token(inputTokenAddress, event);
    const outputToken = getOrCreateErc20Token(outputTokenAddress, event);

    const exchangeRateInputToOutput = bigDecimalSafeDiv(
        formatUnits(outputTokenAmount, outputToken.decimals),
        formatUnits(inputTokenAmount, inputToken.decimals)
    );
    const exchangeRateOutputToInput = bigDecimalSafeDiv(ONE_BD, exchangeRateInputToOutput);

    if (Address.fromBytes(pair.tokenA).equals(inputTokenAddress)) {
        data.volumeAtoB = data.volumeAtoB.plus(inputTokenAmount);
        data.fillCountAtoB = data.fillCountAtoB.plus(ONE_BI);

        data.exchangeRateAtoB = exchangeRateInputToOutput;
        data.exchangeRateBtoA = exchangeRateOutputToInput;
    } else {
        data.volumeBtoA = data.volumeBtoA.plus(inputTokenAmount);
        data.fillCountBtoA = data.fillCountBtoA.plus(ONE_BI);

        data.exchangeRateBtoA = exchangeRateInputToOutput;
        data.exchangeRateAtoB = exchangeRateOutputToInput;
    }

    pair.lastUpdatedBlock = event.block.number;

    data.save();
    pair.save();

    // Create snapshots
    createErc20PairDataSnapshotsIfNecessary(pair, data, event);
}

function createErc20PairDataSnapshotsIfNecessary(
    pair: Erc20TokenPair,
    data: Erc20TokenPairData,
    event: ethereum.Event
): void {
    if (EXCLUDE_HISTORICAL_DATA) {
        return;
    }

    const hour = event.block.timestamp.div(SECONDS_PER_HOUR);
    const day = event.block.timestamp.div(SECONDS_PER_DAY);
    const week = event.block.timestamp.div(SECONDS_PER_WEEK);

    const hourlyId = pair.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(hour)));
    const dailyId = pair.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(day)));
    const weeklyId = pair.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(week)));

    let dailyData = DailyErc20TokenPairData.load(dailyId);
    let weeklyData = WeeklyErc20TokenPairData.load(weeklyId);

    if (!dailyData || !weeklyData) {
        const dataId = hourlyId;
        const dataSnapshot = copyEntity(data, new Erc20TokenPairData(dataId));
        dataSnapshot.save();

        if (!dailyData) {
            dailyData = new DailyErc20TokenPairData(dailyId);
            dailyData.day = day;
            dailyData.timestamp = event.block.timestamp;
            dailyData.pair = pair.id;
            dailyData.data = dataSnapshot.id;
            dailyData.save();
        }

        if (!weeklyData) {
            weeklyData = new WeeklyErc20TokenPairData(weeklyId);
            weeklyData.week = week;
            weeklyData.timestamp = event.block.timestamp;
            weeklyData.pair = pair.id;
            weeklyData.data = dataSnapshot.id;
            weeklyData.save();
        }
    }
}
