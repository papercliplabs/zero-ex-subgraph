import { ethereum, Address, log, BigInt, BigDecimal, Bytes } from "@graphprotocol/graph-ts";
import {
    DailyErc20TokenData,
    Erc20Token,
    Erc20TokenData,
    Erc20TokenPairData,
    WeeklyErc20TokenData,
} from "../../generated/schema";
import { Erc20 as Erc20Contract } from "../../generated/FlashWallet/Erc20";
import { ChainlinkPriceFeed as ChainlinkPriceFeedContract } from "../../generated/FlashWallet/ChainlinkPriceFeed";
import {
    CHAINLINK_PRICE_FEED_FACTOR,
    NATIVE_ADDRESS,
    EXCLUDE_HISTORICAL_DATA,
    ONE_BD,
    ONE_BI,
    SECONDS_PER_DAY,
    SECONDS_PER_HOUR,
    SECONDS_PER_WEEK,
    ZERO_BD,
    ZERO_BI,
} from "../common/constants";
import {
    getChainlinkNativeToUsdPriceFeedAddress,
    getTokenAddressWhitelist,
    getWrappedNativeAddress,
} from "../common/networkSpecific";
import { getOrCreateErc20TokenPair } from "./erc20TokenPair";
import { bigIntMin, copyEntity, formatUnits, isAddressInWhitelist } from "../common/utils";
import { getOrCreateProtocol } from "./protocol";

export function getOrCreateErc20Token(address: Address, event: ethereum.Event): Erc20Token {
    let token = Erc20Token.load(address);

    if (!token) {
        token = new Erc20Token(address);

        token._protocol = getOrCreateProtocol(event).id;

        token.address = address;

        // 0x uses special address to native ETH
        if (address.equals(NATIVE_ADDRESS)) {
            token.name = "Native Asset";
            token.symbol = "ETH";
            token.decimals = 18;
        } else {
            const erc20Contract = Erc20Contract.bind(address);

            const tryName = erc20Contract.try_name();
            const trySymbol = erc20Contract.try_symbol();
            const tryDecimals = erc20Contract.try_decimals();

            token.name = tryName.reverted ? "UNKNOWN" : tryName.value;
            token.symbol = trySymbol.reverted ? "UNKNOWN" : trySymbol.value;
            token.decimals = tryDecimals.reverted ? 0 : tryDecimals.value;

            if (tryDecimals.reverted) {
                log.error("Create ERC20 - try decimals reverted: {}", [address.toHexString()]);
            }
        }

        token.whitelisted = isAddressInWhitelist(address);

        const data = new Erc20TokenData(address);
        data.token = token.id;

        data.erc20FillInputVolume = ZERO_BI;
        data.erc20FillOutputVolume = ZERO_BI;

        data.erc20FillInputVolumeUsd = ZERO_BD;
        data.erc20FillOutputVolumeUsd = ZERO_BD;

        data.erc20InputFillCount = ZERO_BI;
        data.erc20OutputFillCount = ZERO_BI;

        data.nftFillVolume = ZERO_BI;
        data.nftFillVolumeUsd = ZERO_BD;
        data.nftFillCount = ZERO_BI;

        data.derivedPriceInNative = ZERO_BD;
        data.derivedPriceInUsd = ZERO_BD;

        data.save();

        token.data = data.id;
        token.lastUpdatedBlock = event.block.number;
        token.lastDerivedPriceBlock = ZERO_BI;

        token.save();
    }

    return token;
}

export function updateErc20TokenDataForErc20FillAndGetDerivedFillAmountUsd(
    address: Address,
    fillAmount: BigInt,
    isInput: boolean,
    event: ethereum.Event
): BigDecimal {
    const token = getOrCreateErc20Token(address, event);
    const data = Erc20TokenData.load(token.id)!; // Guaranteed to exist

    // Update derived ETH prices - before updating usd values
    updateErc20TokenDerivedEthPrice(token, data, event);

    const fillAmountUsd = formatUnits(fillAmount, token.decimals).times(data.derivedPriceInUsd);

    if (isInput) {
        data.erc20FillInputVolume = data.erc20FillInputVolume.plus(fillAmount);
        data.erc20FillInputVolumeUsd = data.erc20FillInputVolumeUsd.plus(fillAmountUsd);
        data.erc20InputFillCount = data.erc20InputFillCount.plus(ONE_BI);
    } else {
        data.erc20FillOutputVolume = data.erc20FillOutputVolume.plus(fillAmount);
        data.erc20FillOutputVolumeUsd = data.erc20FillOutputVolumeUsd.plus(fillAmountUsd);
        data.erc20OutputFillCount = data.erc20OutputFillCount.plus(ONE_BI);
    }

    token.lastUpdatedBlock = event.block.number;

    data.save();
    token.save();

    // Create snapshots
    createErc20TokenDataSnapshotsIfNecessary(token, data, event);

    return fillAmountUsd;
}

function updateErc20TokenDerivedEthPrice(token: Erc20Token, data: Erc20TokenData, event: ethereum.Event): void {
    const tokenAddressWhitelist = getTokenAddressWhitelist();

    let maxBlockWhitelistToken = getOrCreateErc20Token(tokenAddressWhitelist[0], event); // Initial placeholder only
    let maxBlock = ZERO_BI;

    if (
        Address.fromBytes(token.address).equals(NATIVE_ADDRESS) ||
        Address.fromBytes(token.address).equals(getWrappedNativeAddress())
    ) {
        // It is native or wrapped native, set to 1 and put as this block
        data.derivedPriceInNative = ONE_BD;
        token.lastDerivedPriceBlock = event.block.number;
    } else {
        for (let i = 0; i < tokenAddressWhitelist.length; i++) {
            const whitelistToken = getOrCreateErc20Token(tokenAddressWhitelist[i], event);

            if (whitelistToken.address.notEqual(Address.fromBytes(token.address))) {
                const pair = getOrCreateErc20TokenPair(
                    Address.fromBytes(token.address),
                    Address.fromBytes(whitelistToken.address),
                    event
                );
                const minBlock = bigIntMin(pair.lastUpdatedBlock, whitelistToken.lastDerivedPriceBlock);

                if (minBlock > maxBlock) {
                    maxBlockWhitelistToken = whitelistToken; // TODO
                    maxBlock = minBlock;
                }
            }
        }

        const maxBlockPair = getOrCreateErc20TokenPair(
            Address.fromBytes(token.address),
            Address.fromBytes(maxBlockWhitelistToken.address),
            event
        );
        const maxBlockPairData = Erc20TokenPairData.load(maxBlockPair.id)!; // Guaranteed to exist;
        const maxBlockWhitelistTokenData = Erc20TokenData.load(maxBlockWhitelistToken.id)!; // Guaranteed to exist
        data.derivedPriceInNative = maxBlockWhitelistTokenData.derivedPriceInNative.times(
            Address.fromBytes(maxBlockPair.tokenA).equals(maxBlockWhitelistToken.address)
                ? maxBlockPairData.exchangeRateBtoA
                : maxBlockPairData.exchangeRateAtoB
        );

        token.lastDerivedPriceBlock = maxBlock;
    }

    // Fetch Native -> USD conversion from chainlink price feed
    const nativeToUsdPriceFeedContract = ChainlinkPriceFeedContract.bind(getChainlinkNativeToUsdPriceFeedAddress());
    const latestRoundData = nativeToUsdPriceFeedContract.try_latestRoundData();

    if (latestRoundData.reverted) {
        // Can happen if price feed is deployed after 0x protocol, will miss prices between 0x deployment and price feed deployment in that case
        // Happens with optimism
        // TODO: better solution to ^?
        log.warning("updateErc20TokenDerivedEthPrice: try_latestRoundData reverted", []);
    } else {
        const nativeToUsdPrice = latestRoundData.value.value1.toBigDecimal().div(CHAINLINK_PRICE_FEED_FACTOR);
        data.derivedPriceInUsd = data.derivedPriceInNative.times(nativeToUsdPrice);
    }
}

export function updateErc20TokenDataForNftFillAndGetDerivedFillAmountUsd(
    address: Address,
    fillAmount: BigInt,
    event: ethereum.Event
): BigDecimal {
    const token = getOrCreateErc20Token(address, event);
    const data = Erc20TokenData.load(token.id)!; // Guaranteed to exist

    // Update derived ETH prices - before updating usd values
    updateErc20TokenDerivedEthPrice(token, data, event);

    const fillAmountUsd = formatUnits(fillAmount, token.decimals).times(data.derivedPriceInUsd);

    data.nftFillVolume = data.nftFillVolume.plus(fillAmount);
    data.nftFillVolumeUsd = data.nftFillVolumeUsd.plus(fillAmountUsd);
    data.nftFillCount = data.nftFillCount.plus(ONE_BI);

    data.save();

    // Create snapshots
    createErc20TokenDataSnapshotsIfNecessary(token, data, event);

    return fillAmountUsd;
}

function createErc20TokenDataSnapshotsIfNecessary(
    token: Erc20Token,
    data: Erc20TokenData,
    event: ethereum.Event
): void {
    if (EXCLUDE_HISTORICAL_DATA) {
        return;
    }

    const hour = event.block.timestamp.div(SECONDS_PER_HOUR);
    const day = event.block.timestamp.div(SECONDS_PER_DAY);
    const week = event.block.timestamp.div(SECONDS_PER_WEEK);

    const hourlyId = token.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(hour)));
    const dailyId = token.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(day)));
    const weeklyId = token.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(week)));

    let dailyData = DailyErc20TokenData.load(dailyId);
    let weeklyData = WeeklyErc20TokenData.load(weeklyId);

    if (!dailyData || !weeklyData) {
        const dataId = hourlyId;
        const dataSnapshot = copyEntity(data, new Erc20TokenData(dataId));
        dataSnapshot.save();

        if (!dailyData) {
            dailyData = new DailyErc20TokenData(dailyId);
            dailyData.day = day;
            dailyData.timestamp = event.block.timestamp;
            dailyData.token = token.id;
            dailyData.data = dataSnapshot.id;
            dailyData.save();
        }

        if (!weeklyData) {
            weeklyData = new WeeklyErc20TokenData(weeklyId);
            weeklyData.week = week;
            weeklyData.timestamp = event.block.timestamp;
            weeklyData.token = token.id;
            weeklyData.data = dataSnapshot.id;
            weeklyData.save();
        }
    }
}
