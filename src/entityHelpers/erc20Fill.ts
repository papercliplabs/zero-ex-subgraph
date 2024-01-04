import { ethereum, Address, BigInt, Bytes, BigDecimal } from "@graphprotocol/graph-ts";
import { Erc20Fill, Erc20FillTypeSummary, Erc20FillTypeSummaryMetrics } from "../../generated/schema";
import { getOrCreateTransaction } from "./transaction";
import { getOrCreateErc20Token, updateErc20TokenMetricsForErc20FillAndGetDerivedFillAmountUsd } from "./erc20Token";
import { getOrCreateAccount, updateAccountMetricsForErc20Fill } from "./account";
import { getOrCreateErc20TokenPair, updateErc20TokenPairMetrics } from "./erc20TokenPair";
import { getTokenAddressWhitelist } from "../common/networkSpecific";
import { Erc20FillRole, ONE_BI, UniqueUserUsageId, ZERO_BD, ZERO_BI } from "../common/constants";
import { updateProtocolMetricsForErc20Fill } from "./protocol";
import { isUniqueUser } from "../common/utils";

export function createErc20Fill(
    type: string,
    sourceAddress: Address,
    fillerAddress: Address,
    destinationAddress: Address,
    inputTokenAddress: Address,
    outputTokenAddress: Address,
    inputTokenAmount: BigInt,
    outputTokenAmount: BigInt,
    feeRecipientAddress: Address,
    feeRecipientAmount: BigInt,
    protocolFeeAmount: BigInt,
    extraData: string,
    event: ethereum.Event
): Erc20Fill {
    const id = event.transaction.hash.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));
    const fill = new Erc20Fill(id);
    const transaction = getOrCreateTransaction(event);

    fill.blockNumber = event.block.number;
    fill.timestamp = event.block.timestamp;
    fill.transaction = transaction.id;
    fill.logIndex = event.logIndex;

    fill.type = type;

    fill.source = getOrCreateAccount(sourceAddress, event).id;
    fill.filler = getOrCreateAccount(fillerAddress, event).id;
    fill.destination = getOrCreateAccount(destinationAddress, event).id;

    fill.inputToken = getOrCreateErc20Token(inputTokenAddress, event).id;
    fill.outputToken = getOrCreateErc20Token(outputTokenAddress, event).id;

    fill.inputTokenAmount = inputTokenAmount;
    fill.outputTokenAmount = outputTokenAmount;

    fill.feeRecipient = getOrCreateAccount(feeRecipientAddress, event).id;
    fill.feeRecipientAmount = feeRecipientAmount;
    fill.protocolFeeAmount = protocolFeeAmount;

    fill.extraData = extraData;

    fill.tokenPair = getOrCreateErc20TokenPair(inputTokenAddress, outputTokenAddress, event).id;

    fill.save();

    // Increment transaction erc20 fill count
    transaction.erc20FillCount += 1;
    transaction.save();

    // Update erc20 token pair metrics
    updateErc20TokenPairMetrics(inputTokenAddress, inputTokenAmount, outputTokenAddress, outputTokenAmount, event);

    // Update erc20 token metrics - do the whitelisted one first (if it exists), so the non-whitelisted on will derive the most recent price
    let derivedInputTokenAmountUsd = ZERO_BD;
    let derivedOutputTokenAmountUsd = ZERO_BD;
    if (getTokenAddressWhitelist().includes(inputTokenAddress)) {
        derivedInputTokenAmountUsd = updateErc20TokenMetricsForErc20FillAndGetDerivedFillAmountUsd(
            inputTokenAddress,
            inputTokenAmount,
            true,
            event
        );
        derivedOutputTokenAmountUsd = updateErc20TokenMetricsForErc20FillAndGetDerivedFillAmountUsd(
            outputTokenAddress,
            outputTokenAmount,
            false,
            event
        );
    } else {
        derivedOutputTokenAmountUsd = updateErc20TokenMetricsForErc20FillAndGetDerivedFillAmountUsd(
            outputTokenAddress,
            outputTokenAmount,
            false,
            event
        );
        derivedInputTokenAmountUsd = updateErc20TokenMetricsForErc20FillAndGetDerivedFillAmountUsd(
            inputTokenAddress,
            inputTokenAmount,
            true,
            event
        );
    }

    // Update account metrics
    updateAccountMetricsForErc20Fill(
        Address.fromBytes(fill.source),
        Erc20FillRole.Source,
        derivedInputTokenAmountUsd,
        event
    );
    updateAccountMetricsForErc20Fill(
        Address.fromBytes(fill.filler),
        Erc20FillRole.Filler,
        derivedOutputTokenAmountUsd,
        event
    );
    updateAccountMetricsForErc20Fill(
        Address.fromBytes(fill.destination),
        Erc20FillRole.Destination,
        derivedOutputTokenAmountUsd,
        event
    );

    // Update fill summary metrics
    updateErc20FillTypeSummaryMetrics(type, derivedInputTokenAmountUsd, event);

    // Update protocol metrics
    updateProtocolMetricsForErc20Fill(derivedInputTokenAmountUsd, event);

    return fill;
}

function getOrCreateErc20FillTypeSummary(type: string, event: ethereum.Event): Erc20FillTypeSummary {
    const id = Bytes.fromUTF8(type);
    let summary = Erc20FillTypeSummary.load(id);

    if (!summary) {
        summary = new Erc20FillTypeSummary(id);

        summary.type = type;

        const metrics = new Erc20FillTypeSummaryMetrics(id);
        metrics.fillVolumeUsd = ZERO_BD;
        metrics.fillCount = ZERO_BI;
        metrics.uniqueUsers = ZERO_BI;
        metrics.save();

        summary.metrics = metrics.id;

        summary.save();
    }

    return summary;
}

function updateErc20FillTypeSummaryMetrics(type: string, volumeUsd: BigDecimal, event: ethereum.Event): void {
    const summary = getOrCreateErc20FillTypeSummary(type, event);
    const metrics = Erc20FillTypeSummaryMetrics.load(summary.id)!; // Guaranteed to exist

    metrics.fillVolumeUsd = metrics.fillVolumeUsd.plus(volumeUsd);
    metrics.fillCount = metrics.fillCount.plus(ONE_BI);

    if (isUniqueUser(event.transaction.from, UniqueUserUsageId.Erc20FillSummary)) {
        metrics.uniqueUsers = metrics.uniqueUsers.plus(ONE_BI);
    }

    metrics.save();
}
