<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">用户管理</h2>
      <el-button type="primary" :icon="Plus" @click="openDialog()">新增用户</el-button>
    </div>

    <div class="filter-bar">
      <el-form :inline="true" :model="filters">
        <el-form-item label="关键字">
          <el-input v-model="filters.keyword" placeholder="用户名/姓名" clearable @keyup.enter="loadList" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="filters.role" placeholder="全部" clearable>
            <el-option label="管理员" value="ADMIN" />
            <el-option label="门店店长" value="STORE_MANAGER" />
            <el-option label="维修员" value="TECHNICIAN" />
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
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="realName" label="姓名" width="100" />
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'ADMIN' ? 'danger' : row.role === 'STORE_MANAGER' ? 'primary' : 'success'" size="small">
              {{ ROLE_LABEL[row.role] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="store?.name" label="所属门店" width="140" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column label="技能/区域" v-if="form.role === 'TECHNICIAN'">
          <template #default="{ row }">
            <div v-if="row.technician">
              <div>
                技能：
                <el-tag v-for="s in row.technician.skills" :key="s" size="small" type="success" style="margin: 2px">
                  {{ s }}
                </el-tag>
              </div>
              <div style="margin-top: 4px">
                区域：
                <el-tag v-for="r in row.technician.regions" :key="r" size="small" style="margin: 2px">
                  {{ r }}
                </el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
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
            <el-button link type="danger" @click="handleDelete(row)">禁用</el-button>
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
      :title="isEdit ? '编辑用户' : '新增用户'"
      width="560px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码" v-if="isEdit">
          <el-input v-model="form.password" type="password" show-password placeholder="不修改请留空" />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="form.realName" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="管理员" value="ADMIN" />
            <el-option label="门店店长" value="STORE_MANAGER" />
            <el-option label="维修员" value="TECHNICIAN" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属门店" v-if="form.role !== 'ADMIN'">
          <el-select v-model="form.storeId" style="width: 100%" clearable>
            <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" />
        </el-form-item>
        <template v-if="form.role === 'TECHNICIAN'">
          <el-form-item label="技能">
            <el-select v-model="skillsArr" multiple filterable allow-create style="width: 100%" default-first-option>
              <el-option v-for="f in FAULT_TYPES" :key="f" :label="f" :value="f" />
            </el-select>
          </el-form-item>
          <el-form-item label="服务区域">
            <el-select v-model="regionsArr" multiple filterable allow-create style="width: 100%">
              <el-option v-for="r in REGIONS" :key="r" :label="r" :value="r" />
            </el-select>
          </el-form-item>
          <el-form-item label="最大负载">
            <el-input-number v-model="form.maxLoad" :min="1" :max="20" />
          </el-form-item>
        </template>
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
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { Plus, Search, Refresh } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus';
import { userApi, type CreateUserInput, type UpdateUserInput } from '@/api/user';
import { storeApi } from '@/api/store';
import type { User, Store } from '@/types';
import dayjs from 'dayjs';
import { ROLE_LABEL, FAULT_TYPES, REGIONS } from '@/constants';

const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const formRef = ref<FormInstance>();

const list = ref<User[]>([]);
const stores = ref<Store[]>([]);
const filters = reactive({ keyword: '', role: '' as any });
const pagination = reactive({ page: 1, pageSize: 20, total: 0 });

const form = reactive<CreateUserInput & UpdateUserInput & { id?: number }>({
  username: '',
  password: '',
  realName: '',
  role: 'STORE_MANAGER',
  phone: '',
  email: '',
  storeId: undefined,
  isActive: true,
  maxLoad: 5,
});

const skillsArr = ref<string[]>([]);
const regionsArr = ref<string[]>([]);

watch(
  () => form.role,
  () => {
    if (form.role === 'ADMIN') {
      form.storeId = undefined;
    }
  }
);

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
};

const formatDate = (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm');

const loadStores = async () => {
  const res = await storeApi.list({ pageSize: 999 });
  stores.value = res.data.data;
};

const loadList = async () => {
  loading.value = true;
  try {
    const res = await userApi.list({
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filters,
    });
    list.value = res.data.data;
    pagination.total = res.data.total;
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  filters.keyword = '';
  filters.role = '';
  pagination.page = 1;
  loadList();
};

const openDialog = (row?: User) => {
  resetForm();
  if (row) {
    isEdit.value = true;
    Object.assign(form, row);
    skillsArr.value = row.technician?.skills || [];
    regionsArr.value = row.technician?.regions || [];
  } else {
    isEdit.value = false;
  }
  dialogVisible.value = true;
};

const resetForm = () => {
  Object.assign(form, {
    username: '',
    password: '',
    realName: '',
    role: 'STORE_MANAGER',
    phone: '',
    email: '',
    storeId: undefined,
    isActive: true,
    maxLoad: 5,
  });
  skillsArr.value = [];
  regionsArr.value = [];
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      const submitData = { ...form, skills: skillsArr.value, regions: regionsArr.value };
      if (!isEdit.value) delete (submitData as any).password;
      if (isEdit.value) {
        const id = form.id!;
        await userApi.update(id, submitData);
        ElMessage.success('编辑成功');
      } else {
        await userApi.create(submitData as CreateUserInput);
        ElMessage.success('新增成功');
      }
      dialogVisible.value = false;
      loadList();
    } finally {
      submitting.value = false;
    }
  });
};

const handleDelete = async (row: User) => {
  try {
    await ElMessageBox.confirm(`确定要禁用用户"${row.realName}"吗？`, '提示', {
      type: 'warning',
    });
    await userApi.delete(row.id);
    ElMessage.success('已禁用');
    loadList();
  } catch {}
};

onMounted(() => {
  loadStores();
  loadList();
});
</script>
