import 'dotenv/config';
import request from 'supertest';
import app from '../app.js';

describe('Extractor server', () => {
    it('extract', async () => {
        const requester = await request(app)
        await requester
            .post('/extract')
            .send({
                fileName: '777.zim'
            })
            .expect({result: 'error', text: 'File test/data/777.zim not found'});

        await requester
            .post('/extract')
            .send({
                fileName: 'wikipedia_en_100_maxi_2022-06.zim',
                limit: 3
            })
            .expect({result: 'ok'});
    });
});