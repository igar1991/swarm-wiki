/**
 * @typedef ListObject
 * @type {Object}
 * @property {string} key
 * @property {string} path
 * @property {string} type
 * @property {string} internal_type
 * @property {string} index
 * @property {string} redirect_index
 * @property {string} internal_type
 * @property {string} mime_type
 * @property {string} item_size
 * @property {string} title
 */

/**
 * Parse zim list output
 *
 * @returns {Array.<ListObject>}
 */
export function parseList(data) {
    const result = []
    const lines = data.split('\n');

    let currentItem = {}
    for (let line of lines) {
        line = line.trim()
        let splitParts = line.split(':')[0]
        splitParts = line.split(splitParts + ':')
        if (splitParts.length !== 2) {
            continue
        }

        const path = splitParts[1].trim()
        if (line.startsWith('path:')) {
            if (currentItem.type && currentItem.type !== 'unknown') {
                result.push(currentItem)
            }

            let type = 'unknown'
            if (path.startsWith('-/')) {
                type = 'file'
            } else if (path.startsWith('A/')) {
                type = 'page'
            } else if (path.startsWith('I/')) {
                type = 'image'
            } else if (path.startsWith('M/')) {
                type = 'meta'
            } else if (path.startsWith('X/')) {
                type = 'index'
            }

            const key = type === 'page' ? path.substring(2) : path
            currentItem = {
                key,
                path,
                type
            }
        } else if (line.startsWith('title:')) {
            currentItem.title = path
        } else if (line.startsWith('idx:')) {
            currentItem.index = path
        } else if (line.startsWith('redirect index:')) {
            currentItem.type = 'redirect'
            currentItem.redirect_index = path
        } else if (line.startsWith('type:')) {
            currentItem.internal_type = path
        } else if (line.startsWith('mime-type:')) {
            currentItem.mime_type = path
        } else if (line.startsWith('item size:')) {
            currentItem.item_size = path
        }
    }

    if (currentItem.type !== 'unknown') {
        result.push(currentItem)
    }

    return result
}