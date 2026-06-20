<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">门店管理</h2>
      <el-button type="primary" :icon="Plus" @click="openDialog()">新增门店</el-button>
    </div>

    <div class="filter-bar">
      <el-form :inline="true" :model="filters">
        <el-form-item label="关键字">
          <el-input v-model="filters.keyword" placeholder="门店编号/名称" clearable @keyup.enter="loadList" />
        </el-form-item>
        <el-form-item label="区域">
          <el-select v-model="filters.region" placeholder="全部" clearable>
            <el-option v-for="r in REGIONS" :key="r" :label="r" :value="r" />
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
        <el-table-column prop="storeCode" label="门店编号" width="120" />
        <el-table-column prop="name" label="门店名称" />
        <el-table-column prop="region" label="区域" width="100" />
        <el-table-column prop="address" label="地址" />
        <el-table-column prop="phone" label="联系电话" width="140" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
              {{ row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
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
      :title="isEdit ? '编辑门店' : '新增门店'"
      width="500px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="门店编号" prop="storeCode">
          <el-input v-model="form.storeCode" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="门店名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="区域" prop="region">
          <el-select v-model="form.region" style="width: 100%">
            <el-option v-for="r in REGIONS" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="form.address" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="状态" v-if="isEdit">
          <el-switch v-model="form.isActive" />
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
import { storeApi, type StoreInput } from '@/api/store';
import type { Store } from '@/types';
import dayjs from 'dayjs';
import { REGIONS } from '@/constants';

const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const formRef = ref<FormInstance>();

const list = ref<Store[]>([]);
const filters = reactive({ keyword: '', region: '' });
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });

const form = reactive<StoreInput>({
  storeCode: '',
  name: '',
  address: '',
  region: '',
  phone: '',
  isActive: true,
});

const rules: FormRules = {
  storeCode: [{ required: true, message: '请输入门店编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入门店名称', trigger: 'blur' }],
  region: [{ required: true, message: '请选择区域', trigger: 'change' }],
  address: [{ required: true, message: '请输入地址', trigger: 'blur' }],
};

const formatDate = (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm');

const loadList = async () => {
  loading.value = true;
  try {
    const res = await storeApi.list({
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
  filters.region = '';
  pagination.page = 1;
  loadList();
};

const openDialog = (row?: Store) => {
  resetForm();
  if (row) {
    isEdit.value = true;
    Object.assign(form, row);
  } else {
    isEdit.value = false;
  }
  dialogVisible.value = true;
};

const resetForm = () => {
  Object.assign(form, {
    storeCode: '',
    name: '',
    address: '',
    region: '',
    phone: '',
    isActive: true,
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
        await storeApi.update(id, form);
        ElMessage.success('编辑成功');
      } else {
        await storeApi.create(form);
        ElMessage.success('新增成功');
      }
      dialogVisible.value = false;
      loadList();
    } finally {
      submitting.value = false;
    }
  });
};

const handleDelete = async (row: Store) => {
  try {
    await ElMessageBox.confirm(`确定要删除门店"${row.name}"吗？`, '提示', {
      type: 'warning',
    });
    await storeApi.delete(row.id);
    ElMessage.success('删除成功');
    loadList();
  } catch {}
};

onMounted(loadList);
</script>
