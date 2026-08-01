import client from './client';

export const authApi = {
  login(email, password) {
    return client.post('/auth/login', { email, password });
  },

  register({ email, phone, phone_prefix, password, name, referral_code }) {
    return client.post('/auth/register', { email, phone, phone_prefix, password, name, referral_code });
  },

  me() {
    return client.get('/auth/me');
  },

  refresh(refresh_token) {
    return client.post('/auth/refresh', { refresh_token });
  },

  logout() {
    return client.post('/auth/logout');
  },
};
