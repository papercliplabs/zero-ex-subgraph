import {
    ERC1155OrderFilled as ERC1155OrderFilledEvent,
    ERC721OrderFilled as ERC721OrderFilledEvent,
    LimitOrderFilled as LimitOrderFilledEvent,
    LiquidityProviderSwap as LiquidityProviderSwapEvent,
    OtcOrderFilled as OtcOrderFilledEvent,
    RfqOrderFilled as RfqOrderFilledEvent,
    TransformedERC20 as TransformedERC20Event,
} from "../../generated/ZeroExProxy/ZeroExProxy";

export function handleERC1155OrderFilled(event: ERC1155OrderFilledEvent): void {}

export function handleERC721OrderFilled(event: ERC721OrderFilledEvent): void {}

export function handleLimitOrderFilled(event: LimitOrderFilledEvent): void {}

export function handleLiquidityProviderSwap(event: LiquidityProviderSwapEvent): void {}

export function handlerOtcOrderFilled(event: OtcOrderFilledEvent): void {}

export function handleRfqOrderFilled(event: RfqOrderFilledEvent): void {}

export function handleTransformedERC20(event: TransformedERC20Event): void {}
