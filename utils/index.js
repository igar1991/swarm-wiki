import {createClient} from 'redis';

const MIN_KEY = 0;
const MAX_KEY = 2_000_000;

(async function () {
    const client = createClient();
    client.on('error', (err) => console.log('Redis Client Error', err));
    await client.connect();
    const {keys} = await client.scan('0', {
        'COUNT': '10000000',
        'MATCH': 'wiki_page_*'
    })
    for (const key of keys) {
        // 'wiki_page_en_12_Disasters_of_Christmas'
        // or
        // 'wiki_page_index_wikipedia_en_all_maxi_2022-05.zim_1045935'
        const keySplit = key.split('_');
        // 'en' or 'index'
        const keyType = keySplit[2];

        const rawValue = await client.get(key)
        if (!rawValue) {
            console.log('EMPTY rawValue', rawValue);
            continue
        }

        const value = JSON.parse(rawValue);
        if (!value) {
            console.log('EMPTY value', value);
            continue
        }

        if (keyType === 'index') {
            const keyIndex = Number(keySplit[keySplit.length - 1]);
            const itemId = value.meta.index
            const itemKey = value.meta.key

            if (keyIndex < MIN_KEY || keyIndex > MAX_KEY) {
                const cacheKey = `cache_wikipedia_en_all_maxi_2022-05.zim_${itemId}`;
                const infoKey = `wiki_page_en_${itemKey}`

                // console.log('key for deletion', key);
                // await client.del(key);
                // await client.del(cacheKey);
                // await client.del(infoKey);
            }
        } else if (keyType === 'en') {
            if (!(value && value.topic && value.feedReference && value.uploadedData && value.uploadedData.reference)) {
                console.log('DELETE IT', key);
            }
        }

    }

    process.exit()
})()

