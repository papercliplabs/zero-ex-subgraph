import { ethereum, Address, log } from "@graphprotocol/graph-ts";
import { Erc20Token } from "../../generated/schema";
import { Erc20 as Erc20Contract } from "../../generated/FlashWallet/Erc20";
import { ETH_ADDRESS } from "../common/constants";

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

        token.save();
    }

    return token;
}
