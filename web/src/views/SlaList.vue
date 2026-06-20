<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">SLA规则</h2>
      <el-button type="primary" :icon="Plus" @click="openDialog()">新增规则</el-button>
    </div>

    <div class="table-container">
      <el-table :data="list" v-loading="loading" border stripe>
        <el-table-column label="紧急程度" width="100">
          <template #default="{ row }">
            <el-tag :type="URGENCY_TYPE[row.urgency as UrgencyLevel]" size="small">
              {{ URGENCY_LABEL[row.urgency as UrgencyLevel] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="响应时间">
          <template #default="{ row }">{{ row.responseMinutes }} 分钟</template>
        </el-table-column>
        <el-table-column label="解决时间">
          <template #default="{ row }">{{ row.resolutionMinutes }} 分钟</template>
        </el-table-column>
        <el-table-column label="升级时间">
          <template #default="{ row }">{{ row.escalationMinutes }} 分钟</template>
        </el-table-column>
        <el-table-column prop="description" label="说明" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑规则' : '新增规则'"
      width="500px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="紧急程度" prop="urgency">
          <el-select v-model="form.urgency" style="width: 100%" :disabled="isEdit">
            <el-option v-for="(label, key) in URGENCY_LABEL" :key="key" :label="label" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="响应时间(分钟)" prop="responseMinutes">
          <el-input-number v-model="form.responseMinutes" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="解决时间(分钟)" prop="resolutionMinutes">
          <el-input-number v-model="form.resolutionMinutes" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="升级时间(分钟)" prop="escalationMinutes">
          <el-input-number v-model="form.escalationMinutes" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="说明">
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
import { Plus } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus';
import { slaApi, type SlaInput } from '@/api/log';
import type { SlaRule, UrgencyLevel } from '@/types';
import { URGENCY_LABEL, URGENCY_TYPE } from '@/constants';

const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const formRef = ref<FormInstance>();

const list = ref<SlaRule[]>([]);

const form = reactive<SlaInput & { id?: number }>({
  urgency: 'MEDIUM' as UrgencyLevel,
  responseMinutes: 120,
  resolutionMinutes: 1440,
  escalationMinutes: 720,
  description: '',
});

const rules: FormRules = {
  urgency: [{ required: true, message: '请选择紧急程度', trigger: 'change' }],
  responseMinutes: [{ required: true, message: '请输入响应时间', trigger: 'blur' }],
  resolutionMinutes: [{ required: true, message: '请输入解决时间', trigger: 'blur' }],
  escalationMinutes: [{ required: true, message: '请输入升级时间', trigger: 'blur' }],
};

const loadList = async () => {
  loading.value = true;
  try {
    const res = await slaApi.list();
    list.value = res.data!;
  } finally {
    loading.value = false;
  }
};

const openDialog = (row?: SlaRule) => {
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
    urgency: 'MEDIUM' as UrgencyLevel,
    responseMinutes: 120,
    resolutionMinutes: 1440,
    escalationMinutes: 720,
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
        await slaApi.update(form.id!, form);
        ElMessage.success('编辑成功');
      } else {
        await slaApi.create(form);
        ElMessage.success('新增成功');
      }
      dialogVisible.value = false;
      loadList();
    } finally {
      submitting.value = false;
    }
  });
};

const handleDelete = async (row: SlaRule) => {
  try {
    await ElMessageBox.confirm('确定要删除此规则吗？', '提示', { type: 'warning' });
    await slaApi.delete(row.id);
    ElMessage.success('删除成功');
    loadList();
  } catch {}
};

onMounted(loadList);
</script>
