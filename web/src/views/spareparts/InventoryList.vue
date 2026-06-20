<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">库存管理</h2>
      <div>
        <el-button type="warning" :icon="Warning" @click="openLowStockDialog">低库存预警</el-button>
        <el-button type="primary" :icon="Document" @click="openLogDialog">库存流水</el-button>
      </div>
    </div>

    <div class="filter-bar">
      <el-form :inline="true" :model="filters">
        <el-form-item label="关键字">
          <el-input v-model="filters.keyword" placeholder="备件编号/名称" clearable @keyup.enter="loadList" />
        </el-form-item>
        <el-form-item label="门店" v-if="userStore.hasRole(['ADMIN'])">
          <el-select v-model="filters.storeId" placeholder="全部" clearable style="width: 160px">
            <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="库存预警">
          <el-switch v-model="filters.lowStock" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="loadList">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-container">
      <el-table :data="list" v-loading="loading" border stripe>
        <el-table-column prop="sparePart?.partCode" label="备件编号" width="130" />
        <el-table-column prop="sparePart?.name" label="备件名称" />
        <el-table-column prop="sparePart?.category" label="类别" width="100" />
        <el-table-column prop="sparePart?.unit" label="单位" width="70" />
        <el-table-column prop="store?.name" label="门店" width="140" />
        <el-table-column prop="quantity" label="总库存" width="80" align="right" />
        <el-table-column prop="lockedQty" label="已锁定" width="80" align="right">
          <template #default="{ row }">
            <span v-if="row.lockedQty > 0" style="color: #E6A23C">{{ row.lockedQty }}</span>
            <span v-else>0</span>
          </template>
        </el-table-column>
        <el-table-column prop="availableQty" label="可用" width="80" align="right">
          <template #default="{ row }">
            <span :style="{ color: row.availableQty <= row.minStock ? '#F56C6C' : '#67C23A', fontWeight: 'bold' }">
              {{ row.availableQty }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="minStock" label="安全库存" width="80" align="right" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.availableQty <= 0" type="danger" size="small">缺货</el-tag>
            <el-tag v-else-if="row.availableQty <= row.minStock" type="warning" size="small">预警</el-tag>
            <el-tag v-else type="success" size="small">正常</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="info" @click="openLogDialogForItem(row)">流水</el-button>
            <el-button link type="primary" @click="openAdjustDialog(row)" v-if="userStore.hasRole(['ADMIN'])">调整</el-button>
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

    <el-dialog v-model="adjustDialogVisible" title="调整库存" width="400px" @close="resetAdjustForm">
      <el-form ref="adjustFormRef" :model="adjustForm" :rules="adjustRules" label-width="100px">
        <el-form-item label="当前库存">
          <span>{{ adjustingRow?.quantity }}</span>
        </el-form-item>
        <el-form-item label="调整后数量" prop="quantity">
          <el-input-number v-model="adjustForm.quantity" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="安全库存" prop="minStock">
          <el-input-number v-model="adjustForm.minStock" :min="0" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="adjustSubmitting" @click="handleAdjustSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="logDialogVisible" title="库存流水" width="900px" @close="resetLogFilters">
      <div class="filter-bar" style="margin-bottom: 12px">
        <el-form :inline="true" :model="logFilters">
          <el-form-item label="变动类型">
            <el-select v-model="logFilters.changeType" placeholder="全部" clearable style="width: 140px">
              <el-option
                v-for="(label, key) in INVENTORY_CHANGE_TYPE_LABEL"
                :key="key"
                :label="label"
                :value="key"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="门店" v-if="userStore.hasRole(['ADMIN'])">
            <el-select v-model="logFilters.storeId" placeholder="全部" clearable style="width: 140px">
              <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadLogs">查询</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table :data="logList" v-loading="logLoading" border stripe size="small" max-height="400">
        <el-table-column label="时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="sparePart?.name" label="备件" width="120" />
        <el-table-column prop="store?.name" label="门店" width="100" />
        <el-table-column label="变动类型" width="110">
          <template #default="{ row }">
            <el-tag :type="INVENTORY_CHANGE_TYPE_TYPE[row.changeType as InventoryChangeType]" size="small">
              {{ INVENTORY_CHANGE_TYPE_LABEL[row.changeType as InventoryChangeType] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="总库存" width="120" align="center">
          <template #default="{ row }">
            {{ row.quantityBefore }} → {{ row.quantityAfter }}
          </template>
        </el-table-column>
        <el-table-column label="可用" width="120" align="center">
          <template #default="{ row }">
            {{ row.availableQtyBefore }} → {{ row.availableQtyAfter }}
          </template>
        </el-table-column>
        <el-table-column label="锁定" width="120" align="center">
          <template #default="{ row }">
            {{ row.lockedQtyBefore }} → {{ row.lockedQtyAfter }}
          </template>
        </el-table-column>
        <el-table-column prop="operator?.realName" label="操作人" width="80" />
        <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="logPagination.page"
          v-model:page-size="logPagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="logPagination.total"
          layout="total, sizes, prev, pager, next"
          @size-change="loadLogs"
          @current-change="loadLogs"
        />
      </div>
    </el-dialog>

    <el-dialog v-model="lowStockDialogVisible" title="低库存预警" width="800px">
      <el-table :data="lowStockList" v-loading="lowStockLoading" border stripe size="small" max-height="400">
        <el-table-column prop="sparePart?.partCode" label="备件编号" width="130" />
        <el-table-column prop="sparePart?.name" label="备件名称" />
        <el-table-column prop="store?.name" label="门店" width="140" />
        <el-table-column prop="availableQty" label="可用数量" width="90" align="right">
          <template #default="{ row }">
            <span style="color: #F56C6C; font-weight: bold">{{ row.availableQty }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="minStock" label="安全库存" width="90" align="right" />
        <el-table-column label="缺口" width="80" align="right">
          <template #default="{ row }">
            <span style="color: #F56C6C; font-weight: bold">{{ row.minStock - row.availableQty }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.availableQty <= 0" type="danger" size="small">缺货</el-tag>
            <el-tag v-else type="warning" size="small">预警</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="lowStockPagination.page"
          v-model:page-size="lowStockPagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="lowStockPagination.total"
          layout="total, sizes, prev, pager, next"
          @size-change="loadLowStock"
          @current-change="loadLowStock"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { Search, Refresh, Warning, Document } from '@element-plus/icons-vue';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import dayjs from 'dayjs';
import { inventoryApi, type InventoryInput } from '@/api/inventory';
import { storeApi } from '@/api/store';
import type { Inventory, InventoryLog, Store, InventoryChangeType } from '@/types';
import { useUserStore } from '@/store/user';
import { INVENTORY_CHANGE_TYPE_LABEL, INVENTORY_CHANGE_TYPE_TYPE } from '@/constants';

const userStore = useUserStore();
const loading = ref(false);
const adjustSubmitting = ref(false);
const adjustDialogVisible = ref(false);
const adjustFormRef = ref<FormInstance>();
const adjustingRow = ref<Inventory | null>(null);

const list = ref<Inventory[]>([]);
const stores = ref<Store[]>([]);
const filters = reactive({ keyword: '', storeId: undefined as number | undefined, lowStock: false });
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });

const adjustForm = reactive<InventoryInput>({
  quantity: 0,
  minStock: 0,
});

const adjustRules: FormRules = {
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  minStock: [{ required: true, message: '请输入安全库存', trigger: 'blur' }],
};

const logDialogVisible = ref(false);
const logLoading = ref(false);
const logList = ref<InventoryLog[]>([]);
const logFilters = reactive({
  sparePartId: undefined as number | undefined,
  storeId: undefined as number | undefined,
  changeType: undefined as InventoryChangeType | undefined,
});
const logPagination = reactive({ page: 1, pageSize: 20, total: 0 });

const lowStockDialogVisible = ref(false);
const lowStockLoading = ref(false);
const lowStockList = ref<Inventory[]>([]);
const lowStockPagination = reactive({ page: 1, pageSize: 20, total: 0 });

const formatTime = (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm:ss');

const loadStores = async () => {
  const res = await storeApi.list({ pageSize: 999 });
  stores.value = res.data!.data;
};

const loadList = async () => {
  loading.value = true;
  try {
    const res = await inventoryApi.list({
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filters,
      storeId: userStore.userInfo?.role === 'STORE_MANAGER' ? userStore.userInfo.storeId || undefined : filters.storeId,
    });
    list.value = res.data!.data;
    pagination.total = res.data!.total;
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  filters.keyword = '';
  filters.storeId = undefined;
  filters.lowStock = false;
  pagination.page = 1;
  loadList();
};

const openAdjustDialog = (row: Inventory) => {
  adjustingRow.value = row;
  adjustForm.quantity = row.quantity;
  adjustForm.minStock = row.minStock;
  adjustDialogVisible.value = true;
};

const resetAdjustForm = () => {
  adjustingRow.value = null;
  adjustForm.quantity = 0;
  adjustForm.minStock = 0;
};

const handleAdjustSubmit = async () => {
  if (!adjustFormRef.value || !adjustingRow.value) return;
  await adjustFormRef.value.validate(async (valid) => {
    if (!valid) return;
    adjustSubmitting.value = true;
    try {
      await inventoryApi.update(adjustingRow.value!.id, adjustForm);
      ElMessage.success('调整成功');
      adjustDialogVisible.value = false;
      loadList();
    } finally {
      adjustSubmitting.value = false;
    }
  });
};

const openLogDialog = () => {
  logFilters.sparePartId = undefined;
  logFilters.storeId = undefined;
  logFilters.changeType = undefined;
  logPagination.page = 1;
  logDialogVisible.value = true;
  loadLogs();
};

const openLogDialogForItem = (row: Inventory) => {
  logFilters.sparePartId = row.sparePartId;
  logFilters.storeId = row.storeId;
  logFilters.changeType = undefined;
  logPagination.page = 1;
  logDialogVisible.value = true;
  loadLogs();
};

const resetLogFilters = () => {
  logFilters.sparePartId = undefined;
  logFilters.storeId = undefined;
  logFilters.changeType = undefined;
  logList.value = [];
};

const loadLogs = async () => {
  logLoading.value = true;
  try {
    const res = await inventoryApi.listLogs({
      page: logPagination.page,
      pageSize: logPagination.pageSize,
      sparePartId: logFilters.sparePartId,
      storeId: userStore.userInfo?.role === 'STORE_MANAGER' ? userStore.userInfo.storeId || undefined : logFilters.storeId,
      changeType: logFilters.changeType,
    });
    logList.value = res.data!.data;
    logPagination.total = res.data!.total;
  } finally {
    logLoading.value = false;
  }
};

const openLowStockDialog = () => {
  lowStockPagination.page = 1;
  lowStockDialogVisible.value = true;
  loadLowStock();
};

const loadLowStock = async () => {
  lowStockLoading.value = true;
  try {
    const res = await inventoryApi.getLowStockAlerts({
      page: lowStockPagination.page,
      pageSize: lowStockPagination.pageSize,
      storeId: userStore.userInfo?.role === 'STORE_MANAGER' ? userStore.userInfo.storeId || undefined : undefined,
    });
    lowStockList.value = res.data!.data;
    lowStockPagination.total = res.data!.total;
  } finally {
    lowStockLoading.value = false;
  }
};

onMounted(() => {
  loadStores();
  loadList();
});
</script>
