import {
    ERC1155OrderFilled as ERC1155OrderFilledEvent,
    ERC721OrderFilled as ERC721OrderFilledEvent,
    LimitOrderFilled as LimitOrderFilledEvent,
    LiquidityProviderSwap as LiquidityProviderSwapEvent,
    OtcOrderFilled as OtcOrderFilledEvent,
    RfqOrderFilled as RfqOrderFilledEvent,
    TransformedERC20 as TransformedERC20Event,
} from "../../generated/ZeroExProxy/ZeroExProxy";
import { ETH_ADDRESS, Erc20FillType, ZERO_ADDRESS, ZERO_BI } from "../common/constants";
import { createErc20Fill } from "../entityHelpers/erc20Fill";
import { findMatchingErc20Transfer } from "../common/utils";
import { Address, log } from "@graphprotocol/graph-ts";

export function handleERC1155OrderFilled(event: ERC1155OrderFilledEvent): void {}

export function handleERC721OrderFilled(event: ERC721OrderFilledEvent): void {}

export function handleLimitOrderFilled(event: LimitOrderFilledEvent): void {
    createErc20Fill(
        Erc20FillType.LimitOrder,
        event.params.maker,
        event.params.taker,
        event.params.maker, // Maker is the destination
        event.params.makerToken,
        event.params.takerToken,
        event.params.makerTokenFilledAmount,
        event.params.takerTokenFilledAmount,
        event.params.feeRecipient,
        event.params.takerTokenFeeFilledAmount,
        event.params.protocolFeePaid,
        event.params.orderHash.toHexString() + "-" + event.params.pool.toHexString(),
        event
    );
}

export function handleLiquidityProviderSwap(event: LiquidityProviderSwapEvent): void {
    const inputTransfer = findMatchingErc20Transfer(
        event.params.inputToken,
        event.params.inputTokenAmount,
        null,
        event.params.provider,
        event
    );

    const inputIsEth = ETH_ADDRESS.equals(event.params.inputToken);

    // When the input token is ETH, we have a call chain that forwards the ETH: sender -> zeroExProxy -> Provider
    // In this case, we know that the sender needed to be the txn from address
    const sender = inputIsEth
        ? event.transaction.from
        : inputTransfer
        ? Address.fromBytes(inputTransfer.from)
        : ZERO_ADDRESS; // If all else fails, leave empty...

    createErc20Fill(
        Erc20FillType.PlugableLiquidityProvider,
        sender,
        event.params.provider,
        event.params.recipient,
        event.params.inputToken,
        event.params.outputToken,
        event.params.inputTokenAmount,
        event.params.outputTokenAmount,
        ZERO_ADDRESS,
        ZERO_BI,
        ZERO_BI,
        "",
        event
    );

    if (ZERO_ADDRESS.equals(sender)) {
        log.warning("Unable to find sender for zeroExProxy.handleLiquidityProviderSwap: {} - {}", [
            event.transaction.hash.toHexString(),
            event.logIndex.toString(),
        ]);
    }
}

export function handlerOtcOrderFilled(event: OtcOrderFilledEvent): void {
    createErc20Fill(
        Erc20FillType.OtcOrder,
        event.params.maker,
        event.params.taker,
        event.params.maker, // Maker is the destination
        event.params.makerToken,
        event.params.takerToken,
        event.params.makerTokenFilledAmount,
        event.params.takerTokenFilledAmount,
        ZERO_ADDRESS,
        ZERO_BI,
        ZERO_BI,
        event.params.orderHash.toHexString(),
        event
    );
}

export function handleRfqOrderFilled(event: RfqOrderFilledEvent): void {
    createErc20Fill(
        Erc20FillType.RfqOrder,
        event.params.maker,
        event.params.taker,
        event.params.maker, // Maker is the destination
        event.params.makerToken,
        event.params.takerToken,
        event.params.makerTokenFilledAmount,
        event.params.takerTokenFilledAmount,
        ZERO_ADDRESS,
        ZERO_BI,
        ZERO_BI,
        event.params.orderHash.toHexString() + "-" + event.params.pool.toHexString(),
        event
    );
}

export function handleTransformedERC20(event: TransformedERC20Event): void {}
