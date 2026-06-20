<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">调拨管理</h2>
      <el-button
        type="primary"
        :icon="Plus"
        @click="openDialog()"
        v-if="userStore.hasRole(['ADMIN'])"
      >
        新建调拨
      </el-button>
    </div>

    <div class="filter-bar">
      <el-form :inline="true" :model="filters">
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 140px">
            <el-option
              v-for="(label, key) in TRANSFER_STATUS_LABEL"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="loadList">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-container">
      <el-table :data="list" v-loading="loading" border stripe>
        <el-table-column prop="transferNo" label="调拨单号" width="160" />
        <el-table-column prop="sparePart?.partCode" label="备件编号" width="120" />
        <el-table-column prop="sparePart?.name" label="备件名称" />
        <el-table-column prop="quantity" label="数量" width="80" align="right" />
        <el-table-column prop="fromStore?.name" label="调出门店" width="120" />
        <el-table-column prop="toStore?.name" label="调入门店" width="120" />
        <el-table-column prop="operator?.realName" label="操作人" width="90" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="TRANSFER_STATUS_TYPE[row.status as TransferStatus]" size="small">
              {{ TRANSFER_STATUS_LABEL[row.status as TransferStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'PENDING' && userStore.hasRole(['ADMIN'])"
              link
              type="primary"
              @click="ship(row)"
            >
              发货
            </el-button>
            <el-button
              v-if="['PENDING', 'IN_TRANSIT'].includes(row.status) && canReceive(row)"
              link
              type="success"
              @click="receive(row)"
            >
              收货
            </el-button>
            <el-button
              v-if="row.status === 'PENDING' && userStore.hasRole(['ADMIN'])"
              link
              type="danger"
              @click="cancel(row)"
            >
              取消
            </el-button>
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

    <el-dialog v-model="dialogVisible" title="新建调拨" width="540px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="备件" prop="sparePartId">
          <el-select v-model="form.sparePartId" filterable style="width: 100%">
            <el-option
              v-for="p in parts"
              :key="p.id"
              :label="`${p.partCode} - ${p.name}`"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="数量" prop="quantity">
          <el-input-number v-model="form.quantity" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="调出门店" prop="fromStoreId">
          <el-select v-model="form.fromStoreId" style="width: 100%">
            <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="调入门店" prop="toStoreId">
          <el-select v-model="form.toStoreId" style="width: 100%">
            <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联申请">
          <el-select v-model="form.requestId" clearable filterable style="width: 100%">
            <el-option
              v-for="r in requests"
              :key="r.id"
              :label="r.requestNo"
              :value="r.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { Plus, Search, Refresh } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus';
import {
  inventoryApi,
  type CreateTransferInput,
  type UpdateTransferInput,
} from '@/api/inventory';
import { sparePartApi } from '@/api/inventory';
import { storeApi } from '@/api/store';
import type { Transfer, SparePart, Store, SparePartRequest, TransferStatus } from '@/types';
import dayjs from 'dayjs';
import { TRANSFER_STATUS_LABEL, TRANSFER_STATUS_TYPE } from '@/constants';
import { useUserStore } from '@/store/user';

const userStore = useUserStore();
const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();

const list = ref<Transfer[]>([]);
const parts = ref<SparePart[]>([]);
const stores = ref<Store[]>([]);
const requests = ref<SparePartRequest[]>([]);
const filters = reactive({ status: '' as any });
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });

const form = reactive<CreateTransferInput>({
  requestId: 0,
  sparePartId: 0,
  fromStoreId: 0,
  toStoreId: 0,
  quantity: 1,
  remark: '',
});

const rules: FormRules = {
  sparePartId: [{ required: true, message: '请选择备件', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  fromStoreId: [{ required: true, message: '请选择调出门店', trigger: 'change' }],
  toStoreId: [
    { required: true, message: '请选择调入门店', trigger: 'change' },
    {
      validator: (_r, value, cb) => {
        if (value && value === form.fromStoreId) cb(new Error('调出和调入门店不能相同'));
        else cb();
      },
      trigger: 'change',
    },
  ],
};

const formatDate = (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm');

const canReceive = (row: Transfer) => {
  if (userStore.hasRole(['ADMIN'])) return true;
  return (
    userStore.userInfo?.role === 'STORE_MANAGER' &&
    userStore.userInfo.storeId === row.toStoreId
  );
};

const loadList = async () => {
  loading.value = true;
  try {
    const res = await inventoryApi.listTransfers({
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: filters.status || undefined,
    });
    list.value = res.data!.data;
    pagination.total = res.data!.total;
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  filters.status = '';
  pagination.page = 1;
  loadList();
};

const ship = async (row: Transfer) => {
  try {
    await ElMessageBox.confirm('确定发货吗？', '提示', { type: 'warning' });
    await inventoryApi.updateTransfer(row.id, {
      status: 'IN_TRANSIT' as TransferStatus,
    } as UpdateTransferInput);
    ElMessage.success('已发货');
    loadList();
  } catch {}
};

const receive = async (row: Transfer) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入收货备注（可选）', '确认收货', {
      confirmButtonText: '确认收货',
      cancelButtonText: '取消',
      inputPattern: /.*/,
    });
    await inventoryApi.receiveTransfer(row.id, { remark: value });
    ElMessage.success('已收货');
    loadList();
  } catch {}
};

const cancel = async (row: Transfer) => {
  try {
    await ElMessageBox.confirm('确定取消此调拨单吗？库存将回退。', '提示', { type: 'warning' });
    await inventoryApi.updateTransfer(row.id, {
      status: 'CANCELLED' as TransferStatus,
    } as UpdateTransferInput);
    ElMessage.success('已取消');
    loadList();
  } catch {}
};

const loadParts = async () => {
  const res = await sparePartApi.list({ pageSize: 999 });
  parts.value = res.data!.data;
};

const loadStores = async () => {
  const res = await storeApi.list({ pageSize: 999 });
  stores.value = res.data!.data;
};

const loadRequests = async () => {
  const res = await inventoryApi.listRequests({ pageSize: 999 });
  requests.value = res.data!.data;
};

const openDialog = () => {
  resetForm();
  loadParts();
  loadStores();
  loadRequests();
  dialogVisible.value = true;
};

const resetForm = () => {
  Object.assign(form, {
    requestId: 0,
    sparePartId: 0,
    fromStoreId: 0,
    toStoreId: 0,
    quantity: 1,
    remark: '',
  });
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      const submitData = { ...form };
      if (!submitData.requestId) delete (submitData as any).requestId;
      await inventoryApi.createTransfer(submitData);
      ElMessage.success('调拨单已创建');
      dialogVisible.value = false;
      loadList();
    } finally {
      submitting.value = false;
    }
  });
};

onMounted(loadList);
</script>
