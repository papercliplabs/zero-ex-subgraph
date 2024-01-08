import { ethereum, Address, BigInt, Bytes, BigDecimal } from "@graphprotocol/graph-ts";
import { Erc20Fill, Erc20FillTypeSummary, Erc20FillTypeSummaryData } from "../../generated/schema";
import { getOrCreateTransaction } from "./transaction";
import { getOrCreateErc20Token, updateErc20TokenDataForErc20FillAndGetDerivedFillAmountUsd } from "./erc20Token";
import { getOrCreateAccount, updateAccountDataForErc20Fill } from "./account";
import { getOrCreateErc20TokenPair, updateErc20TokenPairData } from "./erc20TokenPair";
import { getTokenAddressWhitelist } from "../common/networkSpecific";
import { Erc20FillRole, ONE_BI, UniqueUserUsageId, ZERO_BD, ZERO_BI } from "../common/constants";
import { getOrCreateProtocol, updateProtocolDataForErc20Fill } from "./protocol";
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

    fill._protocol = getOrCreateProtocol(event).id;

    fill.blockNumber = event.block.number;
    fill.timestamp = event.block.timestamp;
    fill.transaction = transaction.id;
    fill.logIndex = event.logIndex;

    fill.type = type;
    fill._fillTypeSummary = getOrCreateErc20FillTypeSummary(type, event).id;

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

    // Update erc20 token pair data
    updateErc20TokenPairData(inputTokenAddress, inputTokenAmount, outputTokenAddress, outputTokenAmount, event);

    // Update erc20 token data - do the whitelisted one first (if it exists), so the non-whitelisted on will derive the most recent price
    let derivedInputTokenAmountUsd = ZERO_BD;
    let derivedOutputTokenAmountUsd = ZERO_BD;
    if (getTokenAddressWhitelist().includes(inputTokenAddress)) {
        derivedInputTokenAmountUsd = updateErc20TokenDataForErc20FillAndGetDerivedFillAmountUsd(
            inputTokenAddress,
            inputTokenAmount,
            true,
            event
        );
        derivedOutputTokenAmountUsd = updateErc20TokenDataForErc20FillAndGetDerivedFillAmountUsd(
            outputTokenAddress,
            outputTokenAmount,
            false,
            event
        );
    } else {
        derivedOutputTokenAmountUsd = updateErc20TokenDataForErc20FillAndGetDerivedFillAmountUsd(
            outputTokenAddress,
            outputTokenAmount,
            false,
            event
        );
        derivedInputTokenAmountUsd = updateErc20TokenDataForErc20FillAndGetDerivedFillAmountUsd(
            inputTokenAddress,
            inputTokenAmount,
            true,
            event
        );
    }

    // Update account data
    updateAccountDataForErc20Fill(
        Address.fromBytes(fill.source),
        Erc20FillRole.Source,
        derivedInputTokenAmountUsd,
        event
    );
    updateAccountDataForErc20Fill(
        Address.fromBytes(fill.filler),
        Erc20FillRole.Filler,
        derivedOutputTokenAmountUsd,
        event
    );
    updateAccountDataForErc20Fill(
        Address.fromBytes(fill.destination),
        Erc20FillRole.Destination,
        derivedOutputTokenAmountUsd,
        event
    );

    // Update fill summary data
    updateErc20FillTypeSummaryData(type, derivedInputTokenAmountUsd, event);

    // Update protocol data
    updateProtocolDataForErc20Fill(derivedInputTokenAmountUsd, event);

    return fill;
}

export function getOrCreateErc20FillTypeSummary(type: string, event: ethereum.Event): Erc20FillTypeSummary {
    const id = Bytes.fromUTF8(type);
    let summary = Erc20FillTypeSummary.load(id);

    if (!summary) {
        summary = new Erc20FillTypeSummary(id);

        summary._protocol = getOrCreateProtocol(event).id;

        summary.type = type;

        const data = new Erc20FillTypeSummaryData(id);
        data.fillVolumeUsd = ZERO_BD;
        data.fillCount = ZERO_BI;
        data.uniqueUsers = ZERO_BI;
        data.save();

        summary.data = data.id;

        summary.save();
    }

    return summary;
}

function updateErc20FillTypeSummaryData(type: string, volumeUsd: BigDecimal, event: ethereum.Event): void {
    const summary = getOrCreateErc20FillTypeSummary(type, event);
    const data = Erc20FillTypeSummaryData.load(summary.id)!; // Guaranteed to exist

    data.fillVolumeUsd = data.fillVolumeUsd.plus(volumeUsd);
    data.fillCount = data.fillCount.plus(ONE_BI);

    if (isUniqueUser(event.transaction.from, UniqueUserUsageId.Erc20FillSummary)) {
        data.uniqueUsers = data.uniqueUsers.plus(ONE_BI);
    }

    data.save();
}
