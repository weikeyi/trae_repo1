<template>
  <el-container class="main-layout">
    <el-aside width="220px" class="aside">
      <div class="logo">
        <el-icon size="24"><Tools /></el-icon>
        <span>设备报修系统</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <template v-for="item in menuItems" :key="item.path">
          <el-menu-item v-if="!item.roles || hasRoles(item.roles)" :index="item.path">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-icon" size="20"><Fold /></el-icon>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><User /></el-icon>
              {{ userStore.userInfo?.realName }}
              <el-tag size="small" style="margin-left: 8px">{{ roleLabel }}</el-tag>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessageBox } from 'element-plus';
import { useUserStore } from '@/store/user';
import { ROLE_LABEL } from '@/constants';
import type { Role } from '@/types';

interface MenuItem {
  path: string;
  title: string;
  icon: string;
  roles?: Role[];
}

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const menuItems: MenuItem[] = [
  { path: '/dashboard', title: '统计看板', icon: 'DataAnalysis' },
  { path: '/tickets', title: '工单管理', icon: 'Tickets' },
  { path: '/tickets/create', title: '创建工单', icon: 'Plus', roles: ['STORE_MANAGER', 'ADMIN'] },
  { path: '/equipments', title: '设备管理', icon: 'Monitor' },
  { path: '/stores', title: '门店管理', icon: 'OfficeBuilding', roles: ['ADMIN'] },
  { path: '/spare-parts', title: '备件管理', icon: 'Goods' },
  { path: '/inventories', title: '库存管理', icon: 'Box' },
  { path: '/spare-requests', title: '备件申请', icon: 'Document' },
  { path: '/transfers', title: '调拨管理', icon: 'Switch' },
  { path: '/users', title: '用户管理', icon: 'User', roles: ['ADMIN'] },
  { path: '/sla', title: 'SLA规则', icon: 'Timer', roles: ['ADMIN'] },
  { path: '/logs', title: '操作日志', icon: 'Notebook', roles: ['ADMIN'] },
];

const activeMenu = computed(() => route.path);

const roleLabel = computed(() => {
  return userStore.userInfo?.role ? ROLE_LABEL[userStore.userInfo.role] : '';
});

const hasRoles = (roles: Role[]) => {
  if (!userStore.userInfo) return false;
  return roles.includes(userStore.userInfo.role);
};

const handleCommand = (command: string) => {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
      .then(() => {
        userStore.logout();
        router.push('/login');
      })
      .catch(() => {});
  }
};
</script>

<style scoped>
.main-layout {
  height: 100vh;
}

.aside {
  background-color: #304156;
  overflow-x: hidden;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  background-color: #2b2f3a;
  gap: 8px;
}

:deep(.el-menu) {
  border-right: none;
}

.header {
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ebeef5;
  padding: 0 20px;
}

.collapse-icon {
  cursor: pointer;
  color: #606266;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #606266;
  gap: 4px;
}

.main-content {
  background-color: #f0f2f5;
  overflow-y: auto;
  padding: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
