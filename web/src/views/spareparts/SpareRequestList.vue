<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">备件申请</h2>
      <el-button
        type="primary"
        :icon="Plus"
        @click="openDialog()"
        v-if="userStore.hasRole(['TECHNICIAN', 'ADMIN'])"
      >
        新建申请
      </el-button>
    </div>

    <div class="filter-bar">
      <el-form :inline="true" :model="filters">
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 140px">
            <el-option
              v-for="(label, key) in REQUEST_STATUS_LABEL"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="工单号">
          <el-input v-model="ticketKeyword" placeholder="工单号" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="loadList">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-container">
      <el-table :data="list" v-loading="loading" border stripe>
        <el-table-column prop="requestNo" label="申请单号" width="160" />
        <el-table-column prop="ticket?.ticketNo" label="工单号" width="160" />
        <el-table-column prop="sparePart?.partCode" label="备件编号" width="120" />
        <el-table-column prop="sparePart?.name" label="备件名称" />
        <el-table-column label="申请/完成" width="110" align="center">
          <template #default="{ row }">
            <span :class="row.fulfilledQty < row.requestQty ? 'text-danger' : 'text-success'">
              {{ row.fulfilledQty }} / {{ row.requestQty }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="fromStore?.name" label="来源门店" width="120" />
        <el-table-column prop="toStore?.name" label="需求门店" width="120" />
        <el-table-column prop="requestedBy?.realName" label="申请人" width="90" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="REQUEST_STATUS_TYPE[row.status]" size="small">
              {{ REQUEST_STATUS_LABEL[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="viewDetail(row)">详情</el-button>
            <el-button
              v-if="row.status === 'PENDING' && userStore.hasRole(['ADMIN'])"
              link
              type="success"
              @click="approve(row)"
            >
              批准
            </el-button>
            <el-button
              v-if="row.status === 'PENDING' && userStore.hasRole(['ADMIN'])"
              link
              type="warning"
              @click="setBackorder(row)"
            >
              缺货待补
            </el-button>
            <el-button
              v-if="row.status === 'PENDING' && userStore.hasRole(['ADMIN'])"
              link
              type="danger"
              @click="reject(row)"
            >
              拒绝
            </el-button>
            <el-button
              v-if="['PENDING', 'APPROVED', 'PARTIAL_FULFILLED', 'BACKORDER'].includes(row.status) &&
                (userStore.hasRole(['ADMIN']) || row.requestedById === userStore.userInfo?.id)"
              link
              type="info"
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

    <el-dialog v-model="dialogVisible" title="新建备件申请" width="540px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="工单" prop="ticketId">
          <el-select v-model="form.ticketId" filterable style="width: 100%" @change="onTicketChange">
            <el-option
              v-for="t in myTickets"
              :key="t.id"
              :label="`${t.ticketNo} - ${t.faultType}`"
              :value="t.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备件" prop="sparePartId">
          <el-select v-model="form.sparePartId" filterable style="width: 100%" @change="onPartChange">
            <el-option
              v-for="p in parts"
              :key="p.id"
              :label="`${p.partCode} - ${p.name}`"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="申请数量" prop="requestQty">
          <el-input-number v-model="form.requestQty" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="库存情况" v-if="availability.locations">
          <div style="width: 100%">
            <p>
              总可用：<b :style="{ color: availability.available ? '#67C23A' : '#F56C6C' }">
                {{ availability.totalAvailable || 0 }}
              </b>
              ，缺货：<b>{{ availability.shortage || 0 }}</b>
            </p>
            <el-table :data="availability.locations" size="small" max-height="150">
              <el-table-column prop="storeName" label="门店" />
              <el-table-column prop="availableQty" label="可用数量" width="100" />
            </el-table>
          </div>
        </el-form-item>
        <el-form-item label="来源门店">
          <el-select v-model="form.fromStoreId" clearable style="width: 100%">
            <el-option
              v-for="loc in availability.locations"
              :key="loc.storeId"
              :label="loc.storeName"
              :value="loc.storeId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import { Plus, Search, Refresh } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus';
import {
  inventoryApi,
  type CreateSparePartRequestInput,
  type UpdateSparePartRequestInput,
} from '@/api/inventory';
import { ticketApi } from '@/api/ticket';
import { sparePartApi } from '@/api/inventory';
import type {
  SparePartRequest,
  RepairTicket,
  SparePart,
  SparePartRequestStatus,
} from '@/types';
import dayjs from 'dayjs';
import { REQUEST_STATUS_LABEL, REQUEST_STATUS_TYPE } from '@/constants';
import { useUserStore } from '@/store/user';

const userStore = useUserStore();
const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();

const list = ref<SparePartRequest[]>([]);
const myTickets = ref<RepairTicket[]>([]);
const parts = ref<SparePart[]>([]);
const availability = reactive<any>({ locations: [] });
const ticketKeyword = ref('');
const filters = reactive({ status: '' as any });
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });

const form = reactive<CreateSparePartRequestInput>({
  ticketId: 0,
  sparePartId: 0,
  requestQty: 1,
  fromStoreId: undefined,
  remark: '',
});

const rules: FormRules = {
  ticketId: [{ required: true, message: '请选择工单', trigger: 'change' }],
  sparePartId: [{ required: true, message: '请选择备件', trigger: 'change' }],
  requestQty: [{ required: true, message: '请输入申请数量', trigger: 'blur' }],
};

const formatDate = (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm');

const loadList = async () => {
  loading.value = true;
  try {
    const res = await inventoryApi.listRequests({
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: filters.status || undefined,
    });
    list.value = res.data.data;
    pagination.total = res.data.total;
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  filters.status = '';
  ticketKeyword.value = '';
  pagination.page = 1;
  loadList();
};

const viewDetail = (row: SparePartRequest) => {
  ElMessageBox.alert(
    `申请单号：${row.requestNo}\n备件：${row.sparePart?.name}\n数量：${row.requestQty}\n状态：${REQUEST_STATUS_LABEL[row.status]}\n备注：${row.remark || '无'}`,
    '申请详情'
  );
};

const approve = async (row: SparePartRequest) => {
  try {
    await ElMessageBox.confirm('确定批准此申请吗？', '提示', { type: 'warning' });
    await inventoryApi.updateRequest(row.id, {
      status: 'APPROVED' as SparePartRequestStatus,
    } as UpdateSparePartRequestInput);
    ElMessage.success('已批准');
    loadList();
  } catch {}
};

const reject = async (row: SparePartRequest) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入拒绝原因', '拒绝申请', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    });
    await inventoryApi.updateRequest(row.id, {
      status: 'REJECTED' as SparePartRequestStatus,
      remark: value,
    } as UpdateSparePartRequestInput);
    ElMessage.success('已拒绝');
    loadList();
  } catch {}
};

const setBackorder = async (row: SparePartRequest) => {
  try {
    await ElMessageBox.confirm('设置为缺货待补？库存将释放。', '提示', { type: 'warning' });
    await inventoryApi.updateRequest(row.id, {
      status: 'BACKORDER' as SparePartRequestStatus,
    } as UpdateSparePartRequestInput);
    ElMessage.success('已设置');
    loadList();
  } catch {}
};

const cancel = async (row: SparePartRequest) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入取消原因', '取消申请', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    });
    await inventoryApi.cancelRequest(row.id, { remark: value });
    ElMessage.success('已取消');
    loadList();
  } catch {}
};

const loadMyTickets = async () => {
  const res = await ticketApi.list({ pageSize: 999 });
  myTickets.value = res.data.data;
};

const loadParts = async () => {
  const res = await sparePartApi.list({ pageSize: 999 });
  parts.value = res.data.data;
};

const onTicketChange = () => {
  checkAvailability();
};

const onPartChange = () => {
  checkAvailability();
};

const checkAvailability = async () => {
  if (!form.sparePartId || !form.requestQty) {
    availability.locations = [];
    return;
  }
  try {
    const res = await inventoryApi.checkAvailability({
      sparePartId: form.sparePartId,
      quantity: form.requestQty,
    });
    Object.assign(availability, res.data);
  } catch {
    availability.locations = [];
  }
};

watch(
  () => form.requestQty,
  () => checkAvailability()
);

const openDialog = () => {
  resetForm();
  loadMyTickets();
  loadParts();
  dialogVisible.value = true;
};

const resetForm = () => {
  Object.assign(form, {
    ticketId: 0,
    sparePartId: 0,
    requestQty: 1,
    fromStoreId: undefined,
    remark: '',
  });
  availability.locations = [];
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      await inventoryApi.createRequest(form);
      ElMessage.success('申请已提交');
      dialogVisible.value = false;
      loadList();
    } finally {
      submitting.value = false;
    }
  });
};

onMounted(loadList);
</script>

<style scoped>
.text-danger {
  color: #f56c6c;
}
.text-success {
  color: #67c23a;
}
</style>
