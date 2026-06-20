import { defineStore } from 'pinia';
import type { User, Role } from '@/types';
import { authApi } from '@/api/auth';
import { userApi } from '@/api/user';

interface UserState {
  token: string | null;
  userInfo: User | null;
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    token: localStorage.getItem('token'),
    userInfo: null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    role: (state): Role | null => state.userInfo?.role || null,
    hasRole: (state) => (roles: Role[]) => {
      if (!state.userInfo) return false;
      return roles.includes(state.userInfo.role);
    },
  },

  actions: {
    async login(username: string, password: string) {
      const res = await authApi.login({ username, password });
      this.token = res.data!.token;
      this.userInfo = res.data!.user as User;
      localStorage.setItem('token', res.data!.token);
      return res.data;
    },

    async fetchUserInfo() {
      const res = await userApi.getCurrent();
      this.userInfo = (res.data as User) || null;
      return res.data;
    },

    logout() {
      this.token = null;
      this.userInfo = null;
      localStorage.removeItem('token');
    },
  },
});
