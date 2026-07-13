import client from './client';

export const referralApi = {
  getCode() {
    return client.get('/referral/code');
  },

  getStats() {
    return client.get('/referral/stats');
  },
};
