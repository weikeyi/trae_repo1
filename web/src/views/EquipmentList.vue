<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">设备管理</h2>
      <el-button
        type="primary"
        :icon="Plus"
        @click="openDialog()"
        v-if="userStore.hasRole(['ADMIN', 'STORE_MANAGER'])"
      >
        新增设备
      </el-button>
    </div>

    <div class="filter-bar">
      <el-form :inline="true" :model="filters">
        <el-form-item label="关键字">
          <el-input v-model="filters.keyword" placeholder="设备编号/名称/型号" clearable @keyup.enter="loadList" />
        </el-form-item>
        <el-form-item label="类别">
          <el-select v-model="filters.category" placeholder="全部" clearable>
            <el-option v-for="c in EQUIPMENT_CATEGORIES" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="门店" v-if="userStore.hasRole(['ADMIN', 'TECHNICIAN'])">
          <el-select v-model="filters.storeId" placeholder="全部" clearable style="width: 160px">
            <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
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
        <el-table-column prop="equipmentCode" label="设备编号" width="140" />
        <el-table-column prop="name" label="设备名称" />
        <el-table-column prop="category" label="类别" width="100" />
        <el-table-column prop="model" label="型号" width="140" />
        <el-table-column prop="store?.name" label="所属门店" width="140" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'NORMAL' ? 'success' : row.status === 'FAULT' ? 'danger' : 'warning'" size="small">
              {{ row.status === 'NORMAL' ? '正常' : row.status === 'FAULT' ? '故障' : row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right" v-if="userStore.hasRole(['ADMIN', 'STORE_MANAGER'])">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
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

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑设备' : '新增设备'"
      width="500px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="设备编号" prop="equipmentCode">
          <el-input v-model="form.equipmentCode" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="设备名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="类别" prop="category">
          <el-select v-model="form.category" style="width: 100%">
            <el-option v-for="c in EQUIPMENT_CATEGORIES" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="型号">
          <el-input v-model="form.model" />
        </el-form-item>
        <el-form-item label="所属门店" prop="storeId" v-if="userStore.hasRole(['ADMIN'])">
          <el-select v-model="form.storeId" style="width: 100%">
            <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="正常" value="NORMAL" />
            <el-option label="故障" value="FAULT" />
            <el-option label="维修中" value="REPAIRING" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { Plus, Search, Refresh } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus';
import { equipmentApi, type EquipmentInput } from '@/api/equipment';
import { storeApi } from '@/api/store';
import type { Equipment, Store } from '@/types';
import dayjs from 'dayjs';
import { EQUIPMENT_CATEGORIES } from '@/constants';
import { useUserStore } from '@/store/user';

const userStore = useUserStore();
const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const formRef = ref<FormInstance>();

const list = ref<Equipment[]>([]);
const stores = ref<Store[]>([]);
const filters = reactive({ keyword: '', category: '', storeId: undefined as number | undefined });
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });

const form = reactive<EquipmentInput>({
  equipmentCode: '',
  name: '',
  category: '',
  model: '',
  storeId: undefined,
  status: 'NORMAL',
  description: '',
});

const rules: FormRules = {
  equipmentCode: [{ required: true, message: '请输入设备编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择类别', trigger: 'change' }],
  storeId: [{ required: true, message: '请选择门店', trigger: 'change' }],
};

const formatDate = (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm');

const loadStores = async () => {
  const res = await storeApi.list({ pageSize: 999 });
  stores.value = res.data!.data;
};

const loadList = async () => {
  loading.value = true;
  try {
    const res = await equipmentApi.list({
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filters,
    });
    list.value = res.data!.data;
    pagination.total = res.data!.total;
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  filters.keyword = '';
  filters.category = '';
  filters.storeId = undefined;
  pagination.page = 1;
  loadList();
};

const openDialog = (row?: Equipment) => {
  resetForm();
  if (row) {
    isEdit.value = true;
    Object.assign(form, row);
  } else {
    isEdit.value = false;
    if (userStore.userInfo?.storeId) {
      form.storeId = userStore.userInfo.storeId;
    }
  }
  dialogVisible.value = true;
};

const resetForm = () => {
  Object.assign(form, {
    equipmentCode: '',
    name: '',
    category: '',
    model: '',
    storeId: userStore.userInfo?.storeId,
    status: 'NORMAL',
    description: '',
  });
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      if (isEdit.value) {
        const id = (form as any).id;
        await equipmentApi.update(id, form);
        ElMessage.success('编辑成功');
      } else {
        await equipmentApi.create(form);
        ElMessage.success('新增成功');
      }
      dialogVisible.value = false;
      loadList();
    } finally {
      submitting.value = false;
    }
  });
};

const handleDelete = async (row: Equipment) => {
  try {
    await ElMessageBox.confirm(`确定要删除设备"${row.name}"吗？`, '提示', {
      type: 'warning',
    });
    await equipmentApi.delete(row.id);
    ElMessage.success('删除成功');
    loadList();
  } catch {}
};

onMounted(() => {
  loadStores();
  loadList();
});
</script>
