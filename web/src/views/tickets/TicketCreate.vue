<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">创建工单</h2>
      <el-button :icon="Back" @click="$router.back()">返回</el-button>
    </div>

    <div class="table-container" style="max-width: 720px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="设备" prop="equipmentId">
          <el-select
            v-model="form.equipmentId"
            filterable
            placeholder="请选择设备"
            style="width: 100%"
          >
            <el-option
              v-for="eq in equipments"
              :key="eq.id"
              :label="`${eq.equipmentCode} - ${eq.name} (${eq.store?.name || ''})`"
              :value="eq.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="故障类型" prop="faultType">
          <el-select v-model="form.faultType" style="width: 100%" filterable allow-create>
            <el-option v-for="f in FAULT_TYPES" :key="f" :label="f" :value="f" />
          </el-select>
        </el-form-item>
        <el-form-item label="故障描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="4" placeholder="请详细描述故障现象" />
        </el-form-item>
        <el-form-item label="紧急程度" prop="urgency">
          <el-radio-group v-model="form.urgency">
            <el-radio-button v-for="(label, key) in URGENCY_LABEL" :key="key" :value="key">
              {{ label }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="期望上门时间">
          <el-date-picker
            v-model="form.expectedTime"
            type="datetime"
            placeholder="选择期望上门时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="图片说明">
          <div>
            <el-input
              v-model="imageUrlInput"
              placeholder="输入图片URL后回车添加"
              @keyup.enter="addImage"
              style="width: 400px; margin-right: 8px"
            />
            <el-button @click="addImage">添加</el-button>
            <div style="margin-top: 8px">
              <el-tag
                v-for="(url, idx) in form.imageUrls"
                :key="idx"
                closable
                style="margin: 2px"
                @close="form.imageUrls.splice(idx, 1)"
              >
                {{ url.length > 30 ? url.slice(0, 30) + '...' : url }}
              </el-tag>
              <span v-if="form.imageUrls.length === 0" style="color: #909399; font-size: 12px">
                暂无图片
              </span>
            </div>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">提交工单</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { Back } from '@element-plus/icons-vue';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import { useRouter } from 'vue-router';
import { ticketApi, type CreateTicketInput } from '@/api/ticket';
import { equipmentApi } from '@/api/equipment';
import type { Equipment } from '@/types';
import { FAULT_TYPES, URGENCY_LABEL } from '@/constants';
import { useUserStore } from '@/store/user';

const router = useRouter();
const userStore = useUserStore();
const submitting = ref(false);
const formRef = ref<FormInstance>();
const imageUrlInput = ref('');

const equipments = ref<Equipment[]>([]);

const form = reactive<CreateTicketInput>({
  equipmentId: 0,
  faultType: '',
  description: '',
  urgency: 'MEDIUM',
  imageUrls: [] as string[],
  expectedTime: undefined,
});

const rules: FormRules = {
  equipmentId: [{ required: true, message: '请选择设备', trigger: 'change' }],
  faultType: [{ required: true, message: '请输入故障类型', trigger: 'change' }],
  description: [{ required: true, message: '请描述故障', trigger: 'blur' }],
  urgency: [{ required: true, message: '请选择紧急程度', trigger: 'change' }],
};

const loadEquipments = async () => {
  const res = await equipmentApi.list({
    pageSize: 999,
    storeId: userStore.userInfo?.storeId || undefined,
  });
  equipments.value = res.data.data;
};

const addImage = () => {
  if (imageUrlInput.value && !form.imageUrls.includes(imageUrlInput.value)) {
    form.imageUrls.push(imageUrlInput.value);
    imageUrlInput.value = '';
  }
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      const res = await ticketApi.create(form);
      ElMessage.success('工单创建成功');
      router.push(`/tickets/${res.data.id}`);
    } catch (e: any) {
      if (e?.response?.status === 409) {
        ElMessage.warning(e.response.data.message);
      }
    } finally {
      submitting.value = false;
    }
  });
};

onMounted(loadEquipments);
</script>
