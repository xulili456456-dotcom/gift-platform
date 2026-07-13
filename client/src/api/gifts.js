import client from './client';

export const giftsApi = {
  list() {
    return client.get('/gifts');
  },

  detail(id) {
    return client.get(`/gifts/${id}`);
  },

  eligible() {
    return client.get('/gifts/eligible');
  },
};
