<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">备件管理</h2>
      <el-button
        type="primary"
        :icon="Plus"
        @click="openDialog()"
        v-if="userStore.hasRole(['ADMIN'])"
      >
        新增备件
      </el-button>
    </div>

    <div class="filter-bar">
      <el-form :inline="true" :model="filters">
        <el-form-item label="关键字">
          <el-input v-model="filters.keyword" placeholder="编号/名称" clearable @keyup.enter="loadList" />
        </el-form-item>
        <el-form-item label="类别">
          <el-select v-model="filters.category" placeholder="全部" clearable>
            <el-option v-for="c in SPARE_PART_CATEGORIES" :key="c" :label="c" :value="c" />
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
        <el-table-column prop="partCode" label="备件编号" width="130" />
        <el-table-column prop="name" label="备件名称" />
        <el-table-column prop="category" label="类别" width="100" />
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right" v-if="userStore.hasRole(['ADMIN'])">
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
      :title="isEdit ? '编辑备件' : '新增备件'"
      width="500px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="备件编号" prop="partCode">
          <el-input v-model="form.partCode" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="备件名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="类别" prop="category">
          <el-select v-model="form.category" style="width: 100%">
            <el-option v-for="c in SPARE_PART_CATEGORIES" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-input v-model="form.unit" placeholder="如：台、个、块" />
        </el-form-item>
        <el-form-item label="描述">
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
import { sparePartApi, type SparePartInput } from '@/api/inventory';
import type { SparePart } from '@/types';
import dayjs from 'dayjs';
import { SPARE_PART_CATEGORIES } from '@/constants';
import { useUserStore } from '@/store/user';

const userStore = useUserStore();
const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const formRef = ref<FormInstance>();

const list = ref<SparePart[]>([]);
const filters = reactive({ keyword: '', category: '' });
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });

const form = reactive<SparePartInput & { id?: number }>({
  partCode: '',
  name: '',
  category: '',
  unit: '',
  description: '',
});

const rules: FormRules = {
  partCode: [{ required: true, message: '请输入备件编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入备件名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择类别', trigger: 'change' }],
  unit: [{ required: true, message: '请输入单位', trigger: 'blur' }],
};

const formatDate = (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm');

const loadList = async () => {
  loading.value = true;
  try {
    const res = await sparePartApi.list({
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
  pagination.page = 1;
  loadList();
};

const openDialog = (row?: SparePart) => {
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
    partCode: '',
    name: '',
    category: '',
    unit: '',
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
        await sparePartApi.update(form.id!, form);
        ElMessage.success('编辑成功');
      } else {
        await sparePartApi.create(form);
        ElMessage.success('新增成功');
      }
      dialogVisible.value = false;
      loadList();
    } finally {
      submitting.value = false;
    }
  });
};

const handleDelete = async (row: SparePart) => {
  try {
    await ElMessageBox.confirm(`确定要删除备件"${row.name}"吗？`, '提示', {
      type: 'warning',
    });
    await sparePartApi.delete(row.id);
    ElMessage.success('删除成功');
    loadList();
  } catch {}
};

onMounted(loadList);
</script>
