import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { Erc20Fill } from "../../generated/schema";
import { getOrCreateTransaction } from "./transaction";
import { getOrCreateErc20Token } from "./erc20Token";
import { getOrCreateAccount } from "./account";

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

    fill.save();

    // Increment erc20 fill count
    transaction.erc20FillCount += 1;
    transaction.save();

    return fill;
}
