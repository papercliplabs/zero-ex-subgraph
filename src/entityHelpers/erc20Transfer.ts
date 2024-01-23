import { Bytes, ethereum, log as logger } from "@graphprotocol/graph-ts";
import { Erc20Transfer } from "../../generated/schema";
import { NATIVE_ADDRESS, ONE_BI, TRANSFER_EVENT_SIGNATURE, ZERO_BI } from "../common/constants";
import { getOrCreateErc20Token } from "./erc20Token";
import { getOrCreateAccount } from "./account";

export function createErc20TransfersFromReceipt(event: ethereum.Event): Erc20Transfer[] {
    const receipt = event.receipt;

    if (!receipt) {
        // Should never get here since we require receipts in subgraph.yaml
        logger.error("No logs for event: {} {}", [event.transaction.hash.toHexString(), event.logIndex.toString()]);
        return [];
    }

    const transfers: Erc20Transfer[] = [];

    // // Add in the ETH input as an ERC20 transfer (native assets don't emit events, this is how we can track better)
    // if (event.transaction.value.gt(ZERO_BI) && event.transaction.to) {
    //     const id = event.transaction.hash;
    //     const transfer = new Erc20Transfer(id);
    //     transfer.transaction = event.transaction.hash;
    //     transfer.logIndex = ONE_BI.neg(); // Use -1 for log index for this (its not really part of the logs)
    //     transfer.tokenAddress = getOrCreateErc20Token(NATIVE_ADDRESS, event).id;
    //     transfer.from = getOrCreateAccount(event.transaction.from, event).id;
    //     transfer.to = getOrCreateAccount(event.transaction.to!, event).id;
    //     transfer.amount = event.transaction.value;
    //     transfer.save();
    //     transfers.push(transfer);
    // }

    // Loop through all events, and add in all transfers
    for (let i = 0; i < receipt.logs.length; i++) {
        const log = receipt.logs[i];

        if (log.topics.length > 2) {
            const eventSignature = log.topics[0];
            if (TRANSFER_EVENT_SIGNATURE == eventSignature) {
                const from = ethereum.decode("address", log.topics[1]);
                const to = ethereum.decode("address", log.topics[2]);
                const value = ethereum.decode("uint256", log.data);
                if (!from || !to || !value) {
                    logger.warning("Error decoding transfer event: hash={}, index={}", [
                        event.transaction.hash.toHexString(),
                        log.logIndex.toString(),
                    ]);
                } else {
                    const id = event.transaction.hash.concat(Bytes.fromByteArray(Bytes.fromBigInt(log.logIndex)));
                    const transfer = new Erc20Transfer(id);
                    transfer.transaction = event.transaction.hash;
                    transfer.logIndex = log.logIndex;
                    transfer.tokenAddress = log.address;
                    transfer.fromAddress = from.toAddress();
                    transfer.toAddress = to.toAddress();
                    transfer.amount = value.toBigInt();
                    transfer.save();
                    transfers.push(transfer);
                }
            }
        }
    }

    return transfers;
}
