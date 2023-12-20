import { Address, BigInt, ethereum, log } from "@graphprotocol/graph-ts";
import { getErc20TransfersForTransaction, getOrCreateTransaction } from "../entityHelpers/transaction";
import { Erc20Transfer } from "../../generated/schema";

export function findMatchingErc20Transfer(
    tokenAddress: Address,
    amount: BigInt,
    from: Address | null,
    to: Address | null,
    event: ethereum.Event
): Erc20Transfer | null {
    const transaction = getOrCreateTransaction(event);
    const transfers = getErc20TransfersForTransaction(transaction);

    let foundTransfer: Erc20Transfer | null = null;
    for (let i = 0; i < transfers.length; i++) {
        const transfer = transfers[i];

        // Must be right token
        if (transfer.token.notEqual(tokenAddress)) {
            continue;
        }

        // From or to was specified and didn't match
        if ((from && transfer.from.notEqual(from)) || (to && transfer.to.notEqual(to))) {
            continue;
        }

        // Delta must be lower than current best match
        const delta = transfer.amount.minus(amount).abs();
        if (foundTransfer && delta.gt(foundTransfer.amount.minus(amount).abs())) {
            continue;
        }

        foundTransfer = transfer;
    }

    // if (!foundTransfer) {
    //     log.warning("Didn't find matching erc20 transfer: hash={}, token={}, amount={}, from={}, to={}", [
    //         event.transaction.hash.toHexString(),
    //         tokenAddress.toHexString(),
    //         amount.toString(),
    //         from ? from.toHexString() : "NULL",
    //         to ? to.toHexString() : "NULL",
    //     ]);
    // }
    return foundTransfer;
}
