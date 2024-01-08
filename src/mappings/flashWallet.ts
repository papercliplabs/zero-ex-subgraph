import { Address, log } from "@graphprotocol/graph-ts";
import { BridgeFill as BridgeFillEvent } from "../../generated/FlashWallet/FlashWallet";
import { ETH_ADDRESS, Erc20FillType, ZERO_ADDRESS, ZERO_BI } from "../common/constants";
import { createErc20Fill } from "../entityHelpers/erc20Fill";
import { findMatchingErc20Transfer } from "../common/utils";
import { getFlashWalletAddress } from "../common/networkSpecific";

export function handleBridgeFill(event: BridgeFillEvent): void {
    // token flow goes: flash wallet -> filler -> flash wallet

    const flashWalletToFillerTransaction = findMatchingErc20Transfer(
        event.params.inputToken,
        event.params.inputTokenAmount,
        getFlashWalletAddress(),
        null,
        event
    );

    const fillerToFlashWalletTransaction = findMatchingErc20Transfer(
        event.params.outputToken,
        event.params.outputTokenAmount,
        null,
        getFlashWalletAddress(),
        event
    );

    // Corner case where we will still have ZERO_ADDRESS for the filler when ETH is the input, and a new asset gets minted (ex. liquid staking tokens)
    // But, technically speaking, in this case the zero address is "filling" the order, as that is the where the output tokens are coming from...
    const filler = flashWalletToFillerTransaction // If input is ETH won't find flashWalletToFillerTransaction
        ? Address.fromBytes(flashWalletToFillerTransaction.to)
        : fillerToFlashWalletTransaction
        ? Address.fromBytes(fillerToFlashWalletTransaction.from) // Only get here if the input is ETH, which means the output is not. But, in cases where the output token gets minted, this will be the zero address
        : ZERO_ADDRESS;

    createErc20Fill(
        Erc20FillType.BridgeOrder,
        getFlashWalletAddress(),
        filler,
        getFlashWalletAddress(),
        event.params.inputToken,
        event.params.outputToken,
        event.params.inputTokenAmount,
        event.params.outputTokenAmount,
        ZERO_ADDRESS,
        ZERO_BI,
        ZERO_BI,
        event.params.source.toString(),
        event
    );

    if (ZERO_ADDRESS.equals(filler) && ETH_ADDRESS.notEqual(event.params.inputToken)) {
        log.warning("Unable to find filler for flashWallet.handleBridgeFill: {} - {}", [
            event.transaction.hash.toHexString(),
            event.logIndex.toString(),
        ]);
    }
}
