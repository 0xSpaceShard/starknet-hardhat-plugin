/**
 * Replaces Starknet specific terminology with the terminology used in this plugin.
 * 
 * @param msg the log message to be adapted
 * @returns the log message with adaptation replacements
 */
export function adaptLog(msg: string): string {
    return msg
        .replace("--network", "--starknet-network")
        .replace("--gateway_url", "--gateway-url");
}