<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">操作日志</h2>
      <el-button :icon="Download" @click="handleExport">导出CSV</el-button>
    </div>

    <div class="filter-bar">
      <el-form :inline="true" :model="filters">
        <el-form-item label="模块">
          <el-select v-model="filters.module" placeholder="全部" clearable style="width: 140px">
            <el-option v-for="m in modules" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作">
          <el-select v-model="filters.action" placeholder="全部" clearable style="width: 140px">
            <el-option v-for="a in actions" :key="a" :label="a" :value="a" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键字">
          <el-input v-model="filters.keyword" placeholder="详情" clearable style="width: 180px" @keyup.enter="loadList" />
        </el-form-item>
        <el-form-item label="时间">
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD HH:mm:ss"
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
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="module" label="模块" width="130" />
        <el-table-column prop="action" label="操作类型" width="110" />
        <el-table-column prop="targetType" label="对象类型" width="110" />
        <el-table-column prop="targetId" label="对象ID" width="80" />
        <el-table-column prop="operator?.realName" label="操作人" width="100" />
        <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip />
        <el-table-column prop="ipAddress" label="IP地址" width="130" />
        <el-table-column prop="createdAt" label="时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
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
import { Search, Refresh, Download } from '@element-plus/icons-vue';
import { logApi } from '@/api/log';
import type { OperationLog } from '@/types';
import dayjs from 'dayjs';

const loading = ref(false);

const list = ref<OperationLog[]>([]);
const filters = reactive({ module: '', action: '', keyword: '', dateFrom: '', dateTo: '' });
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });
const dateRange = ref<string[]>();

const modules = ['AUTH', 'USER', 'STORE', 'EQUIPMENT', 'TICKET', 'SPARE_PART', 'INVENTORY', 'SPARE_PART_REQUEST', 'INVENTORY_TRANSFER', 'SLA'];
const actions = ['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'ASSIGN', 'REASSIGN', 'APPROVE', 'REJECT', 'EXPORT', 'LOCK', 'UNLOCK', 'TRANSFER'];

const formatDate = (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm:ss');

const loadList = async () => {
  loading.value = true;
  try {
    const [dateFrom, dateTo] = dateRange.value || ['', ''];
    const res = await logApi.list({
      page: pagination.page,
      pageSize: pagination.pageSize,
      module: filters.module || undefined,
      action: filters.action || undefined,
      keyword: filters.keyword || undefined,
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
  filters.module = '';
  filters.action = '';
  filters.keyword = '';
  dateRange.value = undefined;
  pagination.page = 1;
  loadList();
};

const handleExport = async () => {
  const [dateFrom, dateTo] = dateRange.value || ['', ''];
  const res = await logApi.exportCsv({
    module: filters.module || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const url = window.URL.createObjectURL(new Blob([res as any]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `logs_${Date.now()}.csv`;
  link.click();
};

onMounted(loadList);
</script>
