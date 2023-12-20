import { Address, Bytes, log } from "@graphprotocol/graph-ts";
import { BridgeFill as BridgeFillEvent } from "../../generated/FlashWallet/FlashWallet";
import { Erc20FillType, ZERO_ADDRESS, ZERO_BI } from "../common/constants";
import { createErc20Fill } from "../entityHelpers/erc20Fill";
import { findMatchingErc20Transfer } from "../common/utils";
import { getFlashWalletAddress, getWrappedNativeAssetAddress, getZeroExProxyAddress } from "../common/networkSpecific";

export function handleBridgeFill(event: BridgeFillEvent): void {
    // sender -> flash wallet -> filler -> flash wallet -> recipient
    //                                                  -> fee_recipient

    // sender -> flash wallet
    let inputToFlashWalletTransfer = findMatchingErc20Transfer(
        event.params.inputToken,
        event.params.inputTokenAmount,
        null,
        getFlashWalletAddress(),
        event
    );

    if (inputToFlashWalletTransfer && inputToFlashWalletTransfer.from == getZeroExProxyAddress()) {
        // Need to look back one more, using proxy as the payer
        // i.e went sender -> proxy -> flash wallet
        inputToFlashWalletTransfer = findMatchingErc20Transfer(
            event.params.inputToken,
            event.params.inputTokenAmount,
            null,
            getZeroExProxyAddress(),
            event
        );
    }

    // If where we can't find the input transfer and the input asset is WETH, we have an ETH call chain: sender -> proxy -> flash wallet
    const sender = inputToFlashWalletTransfer
        ? Address.fromBytes(inputToFlashWalletTransfer.from)
        : getWrappedNativeAssetAddress().equals(event.params.inputToken)
        ? event.transaction.from
        : ZERO_ADDRESS; // If all else fails, leave empty...

    //           flash wallet -> filler
    const flashWalletToFillerTransaction = findMatchingErc20Transfer(
        event.params.inputToken,
        event.params.inputTokenAmount,
        getFlashWalletAddress(),
        null,
        event
    );

    //                           filler -> flash wallet
    const outputFromFillerTransfer = findMatchingErc20Transfer(
        event.params.outputToken,
        event.params.outputTokenAmount,
        null,
        getFlashWalletAddress(),
        event
    );

    const filler =
        outputFromFillerTransfer && Address.fromBytes(outputFromFillerTransfer.from).notEqual(ZERO_ADDRESS) // Include this case where we are minting like using maker, so output token comes from zero
            ? Address.fromBytes(outputFromFillerTransfer.from)
            : flashWalletToFillerTransaction // Fallback to this one if we can't find output txn
            ? Address.fromBytes(flashWalletToFillerTransaction.to)
            : ZERO_ADDRESS; // If all else fails

    //                                      flash wallet -> recipient
    const outputFromFlashWalletTransfer = findMatchingErc20Transfer(
        event.params.outputToken,
        event.params.outputTokenAmount,
        getFlashWalletAddress(),
        null,
        event
    );

    // If where we can't find the output transfer and the output asset is WETH, we have an WETH unwrapping and an ETH send: filler -> flash wallet + unwrap -> recipient
    // In this case, it is highly likely the recipient is the sender, but its possible this is a corner case with transformERC20 in a batch fill (see note below)
    const recipient = outputFromFlashWalletTransfer
        ? Address.fromBytes(outputFromFlashWalletTransfer.to)
        : getWrappedNativeAssetAddress().equals(event.params.outputToken)
        ? event.transaction.from // TODO: potentially there is a corner case here with batch fills for transformERC20, where ETH goes to specified recipient
        : ZERO_ADDRESS; // If all else fails, leave empty...

    //                                      flash wallet -> fee_recipient
    // Fee amount is the delta between the fill, and the outputFromFlashWalletTransfer
    // There are no events for affiliateFee transform...
    const feeAmount = outputFromFlashWalletTransfer
        ? event.params.outputTokenAmount.minus(outputFromFlashWalletTransfer.amount)
        : ZERO_BI;

    const feeTransfer = findMatchingErc20Transfer(
        event.params.outputToken,
        feeAmount,
        getFlashWalletAddress(),
        null,
        event
    );

    createErc20Fill(
        Erc20FillType.BridgeOrder,
        sender,
        filler,
        recipient,
        event.params.inputToken,
        event.params.outputToken,
        event.params.inputTokenAmount,
        event.params.outputTokenAmount,
        feeAmount.gt(ZERO_BI) && feeTransfer ? Address.fromBytes(feeTransfer.to) : ZERO_ADDRESS,
        feeAmount,
        ZERO_BI,
        event.params.source.toString(),
        event
    );

    if (ZERO_ADDRESS.equals(sender)) {
        log.warning("Unable to find sender for flashWallet.handleBridgeFill: {} - {}", [
            event.transaction.hash.toHexString(),
            event.logIndex.toString(),
        ]);
    }

    if (ZERO_ADDRESS.equals(filler)) {
        log.warning("Unable to find filler for flashWallet.handleBridgeFill: {} - {}", [
            event.transaction.hash.toHexString(),
            event.logIndex.toString(),
        ]);
    }

    if (ZERO_ADDRESS.equals(recipient)) {
        log.warning("Unable to find recipient for flashWallet.handleBridgeFill: {} - {}", [
            event.transaction.hash.toHexString(),
            event.logIndex.toString(),
        ]);
    }
}
