import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/store/user';
import type { Role } from '@/types';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '统计看板', icon: 'DataAnalysis' },
      },
      {
        path: 'tickets',
        name: 'Tickets',
        component: () => import('@/views/tickets/TicketList.vue'),
        meta: { title: '工单管理', icon: 'Tickets' },
      },
      {
        path: 'tickets/create',
        name: 'CreateTicket',
        component: () => import('@/views/tickets/TicketCreate.vue'),
        meta: { title: '创建工单', icon: 'Plus', roles: ['STORE_MANAGER', 'ADMIN'] as Role[] },
      },
      {
        path: 'tickets/:id',
        name: 'TicketDetail',
        component: () => import('@/views/tickets/TicketDetail.vue'),
        meta: { title: '工单详情' },
      },
      {
        path: 'equipments',
        name: 'Equipments',
        component: () => import('@/views/EquipmentList.vue'),
        meta: { title: '设备管理', icon: 'Monitor' },
      },
      {
        path: 'stores',
        name: 'Stores',
        component: () => import('@/views/StoreList.vue'),
        meta: { title: '门店管理', icon: 'OfficeBuilding', roles: ['ADMIN'] as Role[] },
      },
      {
        path: 'spare-parts',
        name: 'SpareParts',
        component: () => import('@/views/spareparts/SparePartList.vue'),
        meta: { title: '备件管理', icon: 'Goods' },
      },
      {
        path: 'inventories',
        name: 'Inventories',
        component: () => import('@/views/spareparts/InventoryList.vue'),
        meta: { title: '库存管理', icon: 'Box' },
      },
      {
        path: 'spare-requests',
        name: 'SpareRequests',
        component: () => import('@/views/spareparts/SpareRequestList.vue'),
        meta: { title: '备件申请', icon: 'Document' },
      },
      {
        path: 'transfers',
        name: 'Transfers',
        component: () => import('@/views/spareparts/TransferList.vue'),
        meta: { title: '调拨管理', icon: 'Switch' },
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/UserList.vue'),
        meta: { title: '用户管理', icon: 'User', roles: ['ADMIN'] as Role[] },
      },
      {
        path: 'sla',
        name: 'Sla',
        component: () => import('@/views/SlaList.vue'),
        meta: { title: 'SLA规则', icon: 'Timer', roles: ['ADMIN'] as Role[] },
      },
      {
        path: 'logs',
        name: 'Logs',
        component: () => import('@/views/LogList.vue'),
        meta: { title: '操作日志', icon: 'Notebook', roles: ['ADMIN'] as Role[] },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore();

  if (to.meta.public) {
    if (userStore.isLoggedIn && to.path === '/login') {
      next('/');
    } else {
      next();
    }
    return;
  }

  if (!userStore.isLoggedIn) {
    next('/login');
    return;
  }

  if (!userStore.userInfo) {
    try {
      await userStore.fetchUserInfo();
    } catch {
      userStore.logout();
      next('/login');
      return;
    }
  }

  if (to.meta.roles && userStore.userInfo) {
    const roles = to.meta.roles as Role[];
    if (!roles.includes(userStore.userInfo.role)) {
      next('/dashboard');
      return;
    }
  }

  next();
});

export default router;
