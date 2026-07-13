import client from './client';

export const adminApi = {
  getStats() {
    return client.get('/admin/stats');
  },

  listUsers(params = {}) {
    return client.get('/admin/users', { params });
  },

  getUserDetail(id) {
    return client.get(`/admin/users/${id}`);
  },

  getUserTree(id) {
    return client.get(`/admin/users/${id}/tree`);
  },

  listGifts() {
    return client.get('/admin/gifts');
  },

  createGift(data) {
    return client.post('/admin/gifts', data);
  },

  updateGift(id, data) {
    return client.put(`/admin/gifts/${id}`, data);
  },

  deleteGift(id) {
    return client.delete(`/admin/gifts/${id}`);
  },

  listClaims(params = {}) {
    return client.get('/admin/claims', { params });
  },

  updateClaim(id, data) {
    return client.put(`/admin/claims/${id}`, data);
  },

  getSettings() {
    return client.get('/admin/settings');
  },

  updateSettings(data) {
    return client.put('/admin/settings', data);
  },

  listWithdrawals(params = {}) {
    return client.get('/admin/withdrawals', { params });
  },

  updateWithdrawal(id, data) {
    return client.put(`/admin/withdrawals/${id}`, data);
  },
};
