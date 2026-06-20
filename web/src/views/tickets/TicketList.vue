<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">工单管理</h2>
      <div>
        <el-button :icon="Download" @click="handleExport" style="margin-right: 8px">导出CSV</el-button>
        <el-button
          type="primary"
          :icon="Plus"
          @click="$router.push('/tickets/create')"
          v-if="userStore.hasRole(['STORE_MANAGER', 'ADMIN'])"
        >
          创建工单
        </el-button>
      </div>
    </div>

    <div class="filter-bar">
      <el-form :inline="true" :model="filters">
        <el-form-item label="关键字">
          <el-input v-model="filters.keyword" placeholder="工单号/描述" clearable @keyup.enter="loadList" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 140px">
            <el-option
              v-for="(label, key) in TICKET_STATUS_LABEL"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="紧急程度">
          <el-select v-model="filters.urgency" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="(label, key) in URGENCY_LABEL" :key="key" :label="label" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="门店" v-if="userStore.hasRole(['ADMIN', 'TECHNICIAN'])">
          <el-select v-model="filters.storeId" placeholder="全部" clearable style="width: 140px">
            <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="创建时间">
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 320px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="loadList">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-container">
      <el-table :data="list" v-loading="loading" border stripe>
        <el-table-column prop="ticketNo" label="工单号" width="160" fixed="left">
          <template #default="{ row }">
            <el-link type="primary" @click="$router.push(`/tickets/${row.id}`)">
              {{ row.ticketNo }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="store?.name" label="门店" width="120" />
        <el-table-column prop="equipment?.equipmentCode" label="设备编号" width="130" />
        <el-table-column prop="equipment?.name" label="设备名称" width="140" />
        <el-table-column prop="faultType" label="故障类型" width="100" />
        <el-table-column prop="description" label="故障描述" min-width="180" show-overflow-tooltip />
        <el-table-column label="紧急程度" width="90">
          <template #default="{ row }">
            <el-tag :type="URGENCY_TYPE[row.urgency as UrgencyLevel]" size="small">
              {{ URGENCY_LABEL[row.urgency as UrgencyLevel] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="TICKET_STATUS_TYPE[row.status as TicketStatus]" size="small">
              {{ TICKET_STATUS_LABEL[row.status as TicketStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdBy?.realName" label="创建人" width="90" />
        <el-table-column prop="assignedTo?.realName" label="维修员" width="90" />
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="$router.push(`/tickets/${row.id}`)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList"
          @current-change="loadList"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { Plus, Search, Refresh, Download } from '@element-plus/icons-vue';
import { ticketApi, type TicketQuery } from '@/api/ticket';
import { storeApi } from '@/api/store';
import type { RepairTicket, Store } from '@/types';
import dayjs from 'dayjs';
import { TICKET_STATUS_LABEL, TICKET_STATUS_TYPE, URGENCY_LABEL, URGENCY_TYPE } from '@/constants';
import { useUserStore } from '@/store/user';
import { TicketStatus, UrgencyLevel } from '@/types';

const userStore = useUserStore();
const loading = ref(false);

const list = ref<RepairTicket[]>([]);
const stores = ref<Store[]>([]);
const dateRange = ref<string[]>();
const filters = reactive<TicketQuery>({
  keyword: '',
  status: undefined,
  urgency: undefined,
  storeId: undefined,
});
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });

const formatDate = (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm');

const loadStores = async () => {
  const res = await storeApi.list({ pageSize: 999 });
  stores.value = res.data!.data;
};

const loadList = async () => {
  loading.value = true;
  try {
    const [dateFrom, dateTo] = dateRange.value || ['', ''];
    const res = await ticketApi.list({
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filters,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
    list.value = res.data!.data;
    pagination.total = res.data!.total;
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  filters.keyword = '';
  filters.status = undefined;
  filters.urgency = undefined;
  filters.storeId = undefined;
  dateRange.value = undefined;
  pagination.page = 1;
  loadList();
};

const handleExport = async () => {
  const [dateFrom, dateTo] = dateRange.value || ['', ''];
  const res = await ticketApi.exportCsv({
    status: filters.status,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const url = window.URL.createObjectURL(new Blob([res as any]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `tickets_${Date.now()}.csv`;
  link.click();
};

onMounted(() => {
  loadStores();
  loadList();
});
</script>
