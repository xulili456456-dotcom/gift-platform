import client from './client';

export const claimsApi = {
  list() {
    return client.get('/claims');
  },

  create(gift_id) {
    return client.post('/claims', { gift_id });
  },
};
