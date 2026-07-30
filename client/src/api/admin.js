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

  // Orders & Holdings
  listOrders(params) { return client.get('/admin/orders', { params }); },
  listHoldings(params) { return client.get('/admin/holdings', { params }); },
  listStores(params) { return client.get('/admin/stores', { params }); },

  // Enhanced stats & finance
  getEnhancedStats() { return client.get('/admin/enhanced-stats'); },
  getUserFinance(id) { return client.get(`/admin/users/${id}/finance`); },
  listUsersEnhanced(params) { return client.get('/admin/users-enhanced', { params }); },
  freezeUser(id) { return client.put(`/admin/users/${id}/freeze`); },
  resetUserPassword(id) { return client.post(`/admin/users/${id}/reset-password`); },
  updateUserBalance(id, data) { return client.post(`/admin/users/${id}/balance`, data); },
  updateUser(id, data) { return client.put(`/admin/users/${id}`, data); },

  // Notifications
  listNotifications() { return client.get('/admin/notifications'); },
  sendNotification(data) { return client.post('/admin/notifications', data); },

  // Audit log
  getAuditLog(params) { return client.get('/admin/audit-log', { params }); },

  // Batch operations
  batchUsers(data) { return client.post('/admin/users/batch', data); },

  // Login as user
  loginAsUser(id) { return client.post(`/admin/users/${id}/login-as`); },

  // IP tracking
  getUserIps(params) { return client.get('/admin/user-ips', { params }); },
  getIpDuplicates() { return client.get('/admin/ip-duplicates'); },
};
