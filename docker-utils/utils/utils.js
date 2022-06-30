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

// todo remove
export const error = (res, text) => {
    return res.status(500).json({result: 'error', text});
}

export const extractFilename = (filePath) => filePath.split('/').pop()
