import { ethereum, Address, log, BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import { Erc20Token, Erc20TokenMetrics, Erc20TokenPairMetrics } from "../../generated/schema";
import { Erc20 as Erc20Contract } from "../../generated/FlashWallet/Erc20";
import { ChainlinkPriceFeed as ChainlinkPriceFeedContract } from "../../generated/FlashWallet/ChainlinkPriceFeed";
import { CHAINLINK_PRICE_FEED_FACTOR, ETH_ADDRESS, ONE_BD, ONE_BI, ZERO_BD, ZERO_BI } from "../common/constants";
import {
    getChainlinkEthToUsdPriceFeedAddress,
    getTokenAddressWhitelist,
    getWrappedNativeAssetAddress,
} from "../common/networkSpecific";
import { getOrCreateErc20TokenPair } from "./erc20TokenPair";
import { bigIntMin, formatUnits } from "../common/utils";
import { updateProtocolMetricsForErc20Fill } from "./protocol";

export function getOrCreateErc20Token(address: Address, event: ethereum.Event): Erc20Token {
    let token = Erc20Token.load(address);

    if (!token) {
        token = new Erc20Token(address);
        token.address = address;

        // 0x uses special address to native ETH
        if (address.equals(ETH_ADDRESS)) {
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

        const metrics = new Erc20TokenMetrics(address);
        metrics.token = token.id;

        metrics.erc20FillInputVolume = ZERO_BI;
        metrics.erc20FillOutputVolume = ZERO_BI;

        metrics.erc20FillInputVolumeUsd = ZERO_BD;
        metrics.erc20FillOutputVolumeUsd = ZERO_BD;

        metrics.erc20InputFillCount = ZERO_BI;
        metrics.erc20OutputFillCount = ZERO_BI;

        metrics.derivedPriceInEth = ZERO_BD;
        metrics.derivedPriceInUsd = ZERO_BD;

        metrics.save();

        token.metrics = metrics.id;
        token.lastUpdatedBlock = event.block.number;
        token.lastDerivedPriceBlock = ZERO_BI;

        token.save();
    }

    return token;
}

export function updateErc20TokenMetricsForErc20FillAndGetDerivedFillAmountUsd(
    address: Address,
    fillAmount: BigInt,
    isInput: boolean,
    event: ethereum.Event
): BigDecimal {
    const token = getOrCreateErc20Token(address, event);
    const metrics = Erc20TokenMetrics.load(token.id)!; // Guaranteed to exist

    // Update derived ETH prices - before updating usd values
    updateErc20TokenDerivedEthPrice(token, metrics, event);

    const fillAmountUsd = formatUnits(metrics.erc20FillInputVolume, token.decimals).times(metrics.derivedPriceInUsd);

    if (isInput) {
        metrics.erc20FillInputVolume = metrics.erc20FillInputVolume.plus(fillAmount);
        metrics.erc20FillInputVolumeUsd = fillAmountUsd;
        metrics.erc20InputFillCount = metrics.erc20InputFillCount.plus(ONE_BI);
    } else {
        metrics.erc20FillOutputVolume = metrics.erc20FillOutputVolume.plus(fillAmount);
        metrics.erc20FillOutputVolumeUsd = fillAmountUsd;
        metrics.erc20OutputFillCount = metrics.erc20OutputFillCount.plus(ONE_BI);
    }

    token.lastUpdatedBlock = event.block.number;

    metrics.save();
    token.save();

    // Create snapshots
    createErc20TokenMetricsSnapshotsIfNecessary(metrics, event);

    return fillAmountUsd;
}

function updateErc20TokenDerivedEthPrice(token: Erc20Token, metrics: Erc20TokenMetrics, event: ethereum.Event): void {
    const tokenAddressWhitelist = getTokenAddressWhitelist();

    let maxBlockWhitelistToken = getOrCreateErc20Token(tokenAddressWhitelist[0], event); // Initial placeholder only
    let maxBlock = ZERO_BI;

    if (
        Address.fromBytes(token.address).equals(ETH_ADDRESS) ||
        Address.fromBytes(token.address).equals(getWrappedNativeAssetAddress())
    ) {
        // It is ETH or WETH, set to 1 and put as this block
        metrics.derivedPriceInEth = ONE_BD;
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
        const maxBlockPairMetrics = Erc20TokenPairMetrics.load(maxBlockPair.id)!; // Guaranteed to exist;
        const maxBlockWhitelistTokenMetrics = Erc20TokenMetrics.load(maxBlockWhitelistToken.id)!; // Guaranteed to exist
        metrics.derivedPriceInEth = maxBlockWhitelistTokenMetrics.derivedPriceInEth.times(
            Address.fromBytes(maxBlockPair.tokenA).equals(maxBlockWhitelistToken.address)
                ? maxBlockPairMetrics.exchangeRateBtoA
                : maxBlockPairMetrics.exchangeRateAtoB
        );

        // Fetch ETH -> USD conversion from chainlink price feed
        const ethToUsdPriceFeedContract = ChainlinkPriceFeedContract.bind(getChainlinkEthToUsdPriceFeedAddress());
        const latestRoundData = ethToUsdPriceFeedContract.latestRoundData();
        const ethToUsdPrice = latestRoundData.value1.toBigDecimal().div(CHAINLINK_PRICE_FEED_FACTOR);
        metrics.derivedPriceInUsd = metrics.derivedPriceInEth.times(ethToUsdPrice);

        token.lastDerivedPriceBlock = maxBlock;
    }
}

function createErc20TokenMetricsSnapshotsIfNecessary(metrics: Erc20TokenMetrics, event: ethereum.Event): void {
    // TODO
}
