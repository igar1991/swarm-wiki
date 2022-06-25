/**
 * Sleeps for a given time
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gets unix timestamp
 */
export function getUnixTimestamp() {
    return Math.round(Date.now() / 1000)
}
