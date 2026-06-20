<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">库存管理</h2>
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
        <el-table-column label="操作" width="100" fixed="right" v-if="userStore.hasRole(['ADMIN'])">
          <template #default="{ row }">
            <el-button link type="primary" @click="openAdjustDialog(row)">调整</el-button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { Search, Refresh } from '@element-plus/icons-vue';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import { inventoryApi, type InventoryInput } from '@/api/inventory';
import { storeApi } from '@/api/store';
import type { Inventory, Store } from '@/types';
import { useUserStore } from '@/store/user';

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

onMounted(() => {
  loadStores();
  loadList();
});
</script>
