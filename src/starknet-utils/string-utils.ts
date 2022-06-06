import { HardhatPluginError } from "hardhat/plugins";

import { PLUGIN_NAME, SHORT_STRING_MAX_CHARACTERS } from "../constants";

export function shortStringToBigInt(convertableString: string) {
    if (!convertableString) {
        throw new HardhatPluginError(PLUGIN_NAME, "A non-empty string must be provided");
    }

    if (convertableString.length > SHORT_STRING_MAX_CHARACTERS) {
        const msg = `Short strings must have a max of ${SHORT_STRING_MAX_CHARACTERS} characters.`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    const invalidChars: { [key: string]: boolean } = {};
    const charArray = [];
    for (const c of convertableString.split("")) {
        const charCode = c.charCodeAt(0);
        if (charCode > 127) {
            invalidChars[c] = true;
        }
        charArray.push(charCode.toString(16));
    }

    const invalidCharArray = Object.keys(invalidChars);
    if (invalidCharArray.length) {
        const msg = `Non-standard-ASCII character${
            invalidCharArray.length === 1 ? "" : "s"
        }: ${invalidCharArray.join(", ")}`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    return BigInt("0x" + charArray.join(""));
}

export function bigIntToShortString(convertableBigInt: BigInt) {
    return Buffer.from(convertableBigInt.toString(16), "hex").toString();
}
