<template>
  <div class="page-container" v-if="ticket">
    <div class="page-header">
      <h2 class="page-title">
        工单详情 - {{ ticket.ticketNo }}
        <el-tag :type="TICKET_STATUS_TYPE[ticket.status]" style="margin-left: 12px">
          {{ TICKET_STATUS_LABEL[ticket.status] }}
        </el-tag>
        <el-tag :type="URGENCY_TYPE[ticket.urgency]" style="margin-left: 8px">
          {{ URGENCY_LABEL[ticket.urgency] }}
        </el-tag>
      </h2>
      <el-button :icon="Back" @click="$router.back()">返回</el-button>
    </div>

    <el-row :gutter="16">
      <el-col :span="16">
        <el-card class="section-card">
          <template #header>
            <div style="font-weight: 600">基本信息</div>
          </template>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="工单号">{{ ticket.ticketNo }}</el-descriptions-item>
            <el-descriptions-item label="紧急程度">
              <el-tag :type="URGENCY_TYPE[ticket.urgency]" size="small">
                {{ URGENCY_LABEL[ticket.urgency] }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="门店">{{ ticket.store?.name }}</el-descriptions-item>
            <el-descriptions-item label="创建人">{{ ticket.createdBy?.realName }}</el-descriptions-item>
            <el-descriptions-item label="维修员">
              {{ ticket.assignedTo?.realName || '未指派' }}
              <span v-if="ticket.assignedTo" style="color: #909399; margin-left: 8px">
                (负载: {{ ticket.assignedTo.technician?.currentLoad }}/{{ ticket.assignedTo.technician?.maxLoad }})
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="SLA截止">
              <span :style="{ color: isOverdue ? '#F56C6C' : '' }">
                {{ ticket.slaDeadline ? formatDate(ticket.slaDeadline) : '-' }}
                <el-tag v-if="isOverdue && !ticket.escalated" type="danger" size="small" style="margin-left: 8px">
                  已超时
                </el-tag>
                <el-tag v-if="ticket.escalated" type="danger" size="small" style="margin-left: 8px">
                  {{ ticket.escalationReason || '已升级' }}
                </el-tag>
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="设备编号">{{ ticket.equipment?.equipmentCode }}</el-descriptions-item>
            <el-descriptions-item label="设备名称">{{ ticket.equipment?.name }}</el-descriptions-item>
            <el-descriptions-item label="故障类型">{{ ticket.faultType }}</el-descriptions-item>
            <el-descriptions-item label="期望上门">
              {{ ticket.expectedTime ? formatDate(ticket.expectedTime) : '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="故障描述" :span="2">
              {{ ticket.description }}
            </el-descriptions-item>
            <el-descriptions-item label="故障图片" :span="2" v-if="ticket.imageUrls?.length">
              <el-image
                v-for="(url, i) in ticket.imageUrls"
                :key="i"
                :src="url"
                :preview-src-list="ticket.imageUrls"
                :initial-index="i"
                fit="cover"
                style="width: 100px; height: 100px; margin-right: 8px; border-radius: 4px"
              />
            </el-descriptions-item>
            <el-descriptions-item label="诊断结果" :span="2" v-if="ticket.diagnosis">
              {{ ticket.diagnosis }}
            </el-descriptions-item>
            <el-descriptions-item label="维修结果" :span="2" v-if="ticket.repairResult">
              {{ ticket.repairResult }}
            </el-descriptions-item>
            <el-descriptions-item label="驳回原因" :span="2" v-if="ticket.rejectReason">
              {{ ticket.rejectReason }}
            </el-descriptions-item>
            <el-descriptions-item label="到场时间" v-if="ticket.arrivedAt">
              {{ formatDate(ticket.arrivedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="完成时间" v-if="ticket.completedAt">
              {{ formatDate(ticket.completedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="验收时间" v-if="ticket.acceptedAt">
              {{ formatDate(ticket.acceptedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDate(ticket.createdAt) }}</el-descriptions-item>
          </el-descriptions>

          <div class="action-bar">
            <template v-if="canAssign">
              <el-button type="primary" @click="openAssignDialog">
                <el-icon><UserIcon /></el-icon>
                派单
              </el-button>
            </template>
            <template v-for="action in availableActions" :key="action.status">
              <el-button
                :type="action.type"
                @click="openStatusDialog(action)"
              >
                {{ action.label }}
              </el-button>
            </template>
            <el-button
              v-if="canReject"
              type="warning"
              @click="handleReject"
            >
              拒单
            </el-button>
            <el-button
              v-if="canCancel"
              type="danger"
              @click="handleCancel"
            >
              取消工单
            </el-button>
            <el-button
              v-if="canMerge"
              @click="openMergeDialog"
            >
              合并工单
            </el-button>
          </div>
        </el-card>

        <el-card class="section-card" style="margin-top: 16px">
          <template #header>
            <div style="font-weight: 600">备件申请</div>
          </template>
          <el-button
            type="primary"
            size="small"
            style="margin-bottom: 12px"
            @click="openSparePartDialog"
            v-if="canRequestSpare"
          >
            申请备件
          </el-button>
          <el-table :data="ticket.sparePartRequests || []" size="small" border>
            <el-table-column prop="requestNo" label="申请单号" width="160" />
            <el-table-column prop="sparePart?.partCode" label="备件编号" width="110" />
            <el-table-column prop="sparePart?.name" label="备件名称" />
            <el-table-column label="数量" width="110" align="center">
              <template #default="{ row }">
                {{ row.fulfilledQty }} / {{ row.requestQty }}
              </template>
            </el-table-column>
            <el-table-column prop="fromStore?.name" label="来源" width="100" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="REQUEST_STATUS_TYPE[row.status as SparePartRequestStatus]" size="small">
                  {{ REQUEST_STATUS_LABEL[row.status as SparePartRequestStatus] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button
                  v-if="row.status === 'PENDING' && userStore.hasRole(['ADMIN', 'TECHNICIAN'])"
                  link
                  type="danger"
                  @click="cancelSpareRequest(row)"
                >
                  取消
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!ticket.sparePartRequests?.length" description="暂无备件申请" />
        </el-card>

        <el-card class="section-card" style="margin-top: 16px">
          <template #header>
            <div style="font-weight: 600">状态流转记录</div>
          </template>
          <el-timeline>
            <el-timeline-item
              v-for="h in ticket.statusHistory || []"
              :key="h.id"
              :timestamp="formatDate(h.createdAt)"
              :type="getStatusTimelineType(h.toStatus)"
            >
              <div>
                <el-tag :type="TICKET_STATUS_TYPE[h.toStatus]" size="small">
                  {{ TICKET_STATUS_LABEL[h.toStatus] }}
                </el-tag>
                <span style="margin-left: 8px; color: #606266">{{ h.operator?.realName }}</span>
              </div>
              <div style="color: #909399; margin-top: 4px; font-size: 13px" v-if="h.remark">
                备注：{{ h.remark }}
              </div>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="section-card">
          <template #header>
            <div style="font-weight: 600">推荐维修员</div>
          </template>
          <el-table :data="recommendedTechs" size="small" border>
            <el-table-column prop="realName" label="姓名" width="80" />
            <el-table-column label="评分" width="60" align="center">
              <template #default="{ row }">{{ row.score }}</template>
            </el-table-column>
            <el-table-column label="负载" width="70" align="center">
              <template #default="{ row }">{{ row.currentLoad }}/{{ row.maxLoad }}</template>
            </el-table-column>
            <el-table-column label="操作" width="70">
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  size="small"
                  v-if="canAssign"
                  @click="quickAssign(row.id)"
                >
                  指派
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="recommendedTechs.length === 0" description="暂无推荐" :image-size="60" />
        </el-card>

        <el-card class="section-card" style="margin-top: 16px" v-if="ticket.mergedTicket || ticket.mergedChildren?.length">
          <template #header>
            <div style="font-weight: 600">关联工单</div>
          </template>
          <div v-if="ticket.mergedTicket">
            <div style="color: #909399; font-size: 12px; margin-bottom: 4px">已合并到：</div>
            <el-link type="primary" @click="$router.push(`/tickets/${ticket.mergedTicket?.id}`)">
              {{ ticket.mergedTicket.ticketNo }}
            </el-link>
          </div>
          <div v-if="ticket.mergedChildren?.length" style="margin-top: 8px">
            <div style="color: #909399; font-size: 12px; margin-bottom: 4px">包含子工单：</div>
            <div v-for="c in ticket.mergedChildren" :key="c.id">
              <el-link type="primary" @click="$router.push(`/tickets/${c.id}`)">
                {{ c.ticketNo }}
              </el-link>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="assignDialogVisible" title="指派维修员" width="500px">
      <el-form :model="assignForm" label-width="80px">
        <el-form-item label="维修员">
          <el-select v-model="assignForm.technicianId" filterable style="width: 100%">
            <el-option
              v-for="t in allTechnicians"
              :key="t.id"
              :label="`${t.realName} (负载: ${t.technician?.currentLoad || 0}/${t.technician?.maxLoad || 5})`"
              :value="t.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="assignForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleAssign">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="statusDialogVisible" :title="statusDialogTitle" width="500px">
      <el-form :model="statusForm" label-width="80px">
        <el-form-item label="诊断" v-if="needDiagnosis">
          <el-input v-model="statusForm.diagnosis" type="textarea" :rows="3" placeholder="请输入诊断结果" />
        </el-form-item>
        <el-form-item label="维修结果" v-if="needResult">
          <el-input v-model="statusForm.repairResult" type="textarea" :rows="3" placeholder="请输入维修结果" />
        </el-form-item>
        <el-form-item label="驳回原因" v-if="needRejectReason">
          <el-input v-model="statusForm.rejectReason" type="textarea" :rows="3" placeholder="请输入驳回原因" />
        </el-form-item>
        <el-form-item label="备注" v-if="needRemark">
          <el-input v-model="statusForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleStatusSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="mergeDialogVisible" title="合并工单" width="500px">
      <el-form :model="mergeForm" label-width="100px">
        <el-form-item label="目标工单">
          <el-select v-model="mergeForm.targetTicketId" filterable style="width: 100%">
            <el-option
              v-for="t in mergeableTickets"
              :key="t.id"
              :label="`${t.ticketNo} - ${t.faultType}`"
              :value="t.id"
            />
          </el-select>
          <div style="color: #909399; font-size: 12px; margin-top: 4px">
            仅可合并相同设备、未关闭的工单
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="mergeForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="mergeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleMerge">确定合并</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="sparePartDialogVisible" title="申请备件" width="540px">
      <el-form :model="spareForm" :rules="spareRules" ref="spareFormRef" label-width="100px">
        <el-form-item label="备件" prop="sparePartId">
          <el-select v-model="spareForm.sparePartId" filterable style="width: 100%" @change="checkAvail">
            <el-option
              v-for="p in allSpareParts"
              :key="p.id"
              :label="`${p.partCode} - ${p.name}`"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="数量" prop="requestQty">
          <el-input-number v-model="spareForm.requestQty" :min="1" style="width: 100%" @change="checkAvail" />
        </el-form-item>
        <el-form-item label="库存" v-if="availabilityInfo.locations?.length">
          <el-table :data="availabilityInfo.locations" size="small" max-height="150" style="width: 100%">
            <el-table-column prop="storeName" label="门店" />
            <el-table-column prop="availableQty" label="可用" width="80" align="right" />
          </el-table>
          <div style="margin-top: 4px; color: #606266">
            总可用：<b :style="{ color: availabilityInfo.available ? '#67C23A' : '#F56C6C' }">
              {{ availabilityInfo.totalAvailable || 0 }}
            </b>
          </div>
        </el-form-item>
        <el-form-item label="来源门店">
          <el-select v-model="spareForm.fromStoreId" clearable style="width: 100%">
            <el-option
              v-for="loc in availabilityInfo.locations"
              :key="loc.storeId"
              :label="loc.storeName"
              :value="loc.storeId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="spareForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sparePartDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSpareRequest">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { Back, User as UserIcon } from '@element-plus/icons-vue';
import {
  ElMessage,
  ElMessageBox,
  FormInstance,
  FormRules,
} from 'element-plus';
import { useRoute } from 'vue-router';
import { ticketApi } from '@/api/ticket';
import { userApi } from '@/api/user';
import { sparePartApi, inventoryApi } from '@/api/inventory';
import type {
  RepairTicket,
  TicketStatus,
  User,
  SparePart,
  SparePartRequest,
  SparePartRequestStatus,
} from '@/types';
import dayjs from 'dayjs';
import {
  TICKET_STATUS_LABEL,
  TICKET_STATUS_TYPE,
  URGENCY_LABEL,
  URGENCY_TYPE,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_TYPE,
} from '@/constants';
import { useUserStore } from '@/store/user';

const route = useRoute();
const userStore = useUserStore();
const submitting = ref(false);
const ticket = ref<RepairTicket | null>(null);
const recommendedTechs = ref<any[]>([]);
const allTechnicians = ref<User[]>([]);
const allSpareParts = ref<SparePart[]>([]);
const mergeableTickets = ref<RepairTicket[]>([]);
const availabilityInfo = reactive<any>({ locations: [] });

const assignDialogVisible = ref(false);
const statusDialogVisible = ref(false);
const mergeDialogVisible = ref(false);
const sparePartDialogVisible = ref(false);
const statusDialogTitle = ref('');
const currentAction = ref<any>(null);
const spareFormRef = ref<FormInstance>();

const assignForm = reactive({ technicianId: 0, remark: '' });
const statusForm = reactive({ status: '' as TicketStatus, remark: '', diagnosis: '', repairResult: '', rejectReason: '' });
const mergeForm = reactive({ targetTicketId: 0, remark: '' });
const spareForm = reactive({
  ticketId: 0,
  sparePartId: 0,
  requestQty: 1,
  fromStoreId: undefined as number | undefined,
  remark: '',
});

const spareRules: FormRules = {
  sparePartId: [{ required: true, message: '请选择备件', trigger: 'change' }],
  requestQty: [{ required: true, message: '请输入数量', trigger: 'blur' }],
};

const formatDate = (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm');

const isOverdue = computed(() => {
  if (!ticket.value?.slaDeadline) return false;
  return new Date(ticket.value.slaDeadline) < new Date() &&
    !['ACCEPTED', 'COMPLETED', 'CANNOT_REPAIR', 'CANCELLED', 'MERGED'].includes(ticket.value.status);
});

interface StatusAction {
  status: TicketStatus;
  label: string;
  type: 'primary' | 'success' | 'warning' | 'danger' | 'info' | '';
  needDiagnosis?: boolean;
  needResult?: boolean;
  needRejectReason?: boolean;
  needRemark?: boolean;
}

const availableActions = computed<StatusAction[]>(() => {
  if (!ticket.value) return [];
  const status = ticket.value.status;
  const role = userStore.userInfo?.role;
  const uid = userStore.userInfo?.id;
  const assignedToId = ticket.value.assignedToId;
  const storeId = ticket.value.storeId;
  const userStoreId = userStore.userInfo?.storeId;

  const actions: StatusAction[] = [];

  if (role === 'TECHNICIAN' && uid === assignedToId) {
    if (status === 'ASSIGNED' || status === 'REJECTED_BY_TECHNICIAN')
      actions.push({ status: 'TECHNICIAN_ON_WAY', label: '到场', type: 'primary', needRemark: true });
    if (status === 'TECHNICIAN_ON_WAY')
      actions.push({ status: 'DIAGNOSING', label: '开始诊断', type: 'primary', needRemark: true });
    if (status === 'DIAGNOSING') {
      actions.push({ status: 'WAITING_SPARE_PARTS', label: '等待备件', type: 'warning', needDiagnosis: true });
      actions.push({ status: 'REPAIRING', label: '开始维修', type: 'primary', needDiagnosis: true });
      actions.push({ status: 'CANNOT_REPAIR', label: '无法维修', type: 'danger', needDiagnosis: true });
    }
    if (status === 'WAITING_SPARE_PARTS')
      actions.push({ status: 'REPAIRING', label: '开始维修', type: 'primary', needRemark: true });
    if (status === 'REPAIRING') {
      actions.push({ status: 'COMPLETED', label: '维修完成', type: 'success', needResult: true });
      actions.push({ status: 'CANNOT_REPAIR', label: '无法维修', type: 'danger', needResult: true });
      actions.push({ status: 'WAITING_SPARE_PARTS', label: '申请备件', type: 'warning' });
    }
    if (status === 'CANNOT_REPAIR')
      actions.push({ status: 'REPAIRING', label: '重新维修', type: 'primary' });
  }

  if (role === 'STORE_MANAGER' && userStoreId === storeId) {
    if (status === 'COMPLETED')
      actions.push({ status: 'ACCEPTED', label: '验收通过', type: 'success', needRemark: true });
    if (status === 'COMPLETED' || status === 'CANNOT_REPAIR')
      actions.push({ status: 'REJECTED', label: '验收驳回', type: 'danger', needRejectReason: true });
    if (status === 'REJECTED') {
      actions.push({ status: 'REPAIRING', label: '要求重修', type: 'primary' });
    }
  }

  if (role === 'ADMIN') {
    if (status === 'REJECTED') {
      actions.push({ status: 'CANCELLED', label: '取消工单', type: 'danger' });
    }
  }

  return actions;
});

const needDiagnosis = computed(() => currentAction.value?.needDiagnosis);
const needResult = computed(() => currentAction.value?.needResult);
const needRejectReason = computed(() => currentAction.value?.needRejectReason);
const needRemark = computed(() => currentAction.value?.needRemark);

const canAssign = computed(() => {
  if (!ticket.value) return false;
  return (
    userStore.hasRole(['ADMIN']) &&
    ['CREATED', 'REJECTED_BY_TECHNICIAN', 'ESCALATED'].includes(ticket.value.status)
  );
});

const canReject = computed(() => {
  if (!ticket.value) return false;
  return (
    userStore.userInfo?.role === 'TECHNICIAN' &&
    userStore.userInfo.id === ticket.value.assignedToId &&
    ticket.value.status === 'ASSIGNED'
  );
});

const canCancel = computed(() => {
  if (!ticket.value) return false;
  if (userStore.hasRole(['ADMIN'])) {
    return !['ACCEPTED', 'CANCELLED', 'MERGED'].includes(ticket.value.status);
  }
  if (userStore.userInfo?.role === 'STORE_MANAGER' && userStore.userInfo.storeId === ticket.value.storeId) {
    return ['CREATED', 'ASSIGNED', 'WAITING_SPARE_PARTS'].includes(ticket.value.status);
  }
  return false;
});

const canMerge = computed(() => {
  if (!ticket.value) return false;
  return userStore.hasRole(['ADMIN']) && !['MERGED', 'CANCELLED', 'ACCEPTED'].includes(ticket.value.status);
});

const canRequestSpare = computed(() => {
  if (!ticket.value) return false;
  return (
    (userStore.hasRole(['ADMIN']) ||
      (userStore.userInfo?.role === 'TECHNICIAN' && userStore.userInfo.id === ticket.value.assignedToId)) &&
    ['DIAGNOSING', 'WAITING_SPARE_PARTS', 'REPAIRING'].includes(ticket.value.status)
  );
});

const getStatusTimelineType = (s: TicketStatus) => {
  const map: Record<string, string> = {
    ACCEPTED: 'success',
    COMPLETED: 'success',
    REJECTED: 'danger',
    CANNOT_REPAIR: 'danger',
    CANCELLED: 'info',
    MERGED: 'info',
    ESCALATED: 'danger',
    REJECTED_BY_TECHNICIAN: 'warning',
  };
  return map[s] || 'primary';
};

const loadTicket = async () => {
  const id = parseInt(route.params.id as string, 10);
  const res = await ticketApi.get(id);
  ticket.value = res.data as RepairTicket || null;
  loadRecommendations();
  loadMergeableTickets();
};

const loadRecommendations = async () => {
  if (!ticket.value) return;
  try {
    const res = await ticketApi.recommendTechnicians({
      equipmentId: ticket.value.equipmentId,
      urgency: ticket.value.urgency,
    });
    recommendedTechs.value = res.data || [];
  } catch {}

  const techRes = await userApi.listTechnicians();
  allTechnicians.value = techRes.data || [];
};

const loadMergeableTickets = async () => {
  if (!ticket.value || !userStore.hasRole(['ADMIN'])) return;
  try {
    const res = await ticketApi.list({
      equipmentId: ticket.value.equipmentId,
      pageSize: 999,
    });
    mergeableTickets.value = res.data!.data.filter(
      (t) =>
        t.id !== ticket.value!.id &&
        !['MERGED', 'CANCELLED', 'ACCEPTED'].includes(t.status)
    );
  } catch {}
};

const loadSpareParts = async () => {
  const res = await sparePartApi.list({ pageSize: 999 });
  allSpareParts.value = res.data!.data;
};

const checkAvail = async () => {
  if (!spareForm.sparePartId || !spareForm.requestQty) {
    availabilityInfo.locations = [];
    return;
  }
  try {
    const res = await inventoryApi.checkAvailability({
      sparePartId: spareForm.sparePartId,
      quantity: spareForm.requestQty,
    });
    Object.assign(availabilityInfo, res.data);
  } catch {
    availabilityInfo.locations = [];
  }
};

const openAssignDialog = () => {
  assignForm.technicianId = recommendedTechs.value[0]?.id || allTechnicians.value[0]?.id || 0;
  assignForm.remark = '';
  assignDialogVisible.value = true;
};

const quickAssign = async (techId: number) => {
  try {
    await ElMessageBox.confirm('确定指派该维修员？', '派单确认', { type: 'warning' });
    await ticketApi.assign(ticket.value!.id, { technicianId: techId });
    ElMessage.success('派单成功');
    loadTicket();
  } catch {}
};

const handleAssign = async () => {
  if (!assignForm.technicianId) {
    ElMessage.warning('请选择维修员');
    return;
  }
  submitting.value = true;
  try {
    await ticketApi.assign(ticket.value!.id, assignForm);
    ElMessage.success('派单成功');
    assignDialogVisible.value = false;
    loadTicket();
  } finally {
    submitting.value = false;
  }
};

const openStatusDialog = (action: StatusAction) => {
  currentAction.value = action;
  statusDialogTitle.value = action.label;
  statusForm.status = action.status;
  statusForm.remark = '';
  statusForm.diagnosis = '';
  statusForm.repairResult = '';
  statusForm.rejectReason = '';
  statusDialogVisible.value = true;
};

const handleStatusSubmit = async () => {
  submitting.value = true;
  try {
    await ticketApi.updateStatus(ticket.value!.id, { ...statusForm });
    ElMessage.success('操作成功');
    statusDialogVisible.value = false;
    loadTicket();
  } finally {
    submitting.value = false;
  }
};

const handleReject = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请输入拒单原因', '维修员拒单', {
      confirmButtonText: '确认拒单',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '请输入拒单原因',
    });
    await ticketApi.reject(ticket.value!.id, { remark: value });
    ElMessage.success('已拒单');
    loadTicket();
  } catch {}
};

const handleCancel = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请输入取消原因', '取消工单', {
      confirmButtonText: '确认取消',
      cancelButtonText: '返回',
      type: 'warning',
    });
    await ticketApi.updateStatus(ticket.value!.id, {
      status: 'CANCELLED' as TicketStatus,
      remark: value,
    });
    ElMessage.success('工单已取消');
    loadTicket();
  } catch {}
};

const openMergeDialog = () => {
  mergeForm.targetTicketId = mergeableTickets.value[0]?.id || 0;
  mergeForm.remark = '';
  mergeDialogVisible.value = true;
};

const handleMerge = async () => {
  if (!mergeForm.targetTicketId) {
    ElMessage.warning('请选择目标工单');
    return;
  }
  submitting.value = true;
  try {
    await ticketApi.merge(ticket.value!.id, mergeForm);
    ElMessage.success('合并成功');
    mergeDialogVisible.value = false;
    loadTicket();
  } finally {
    submitting.value = false;
  }
};

const openSparePartDialog = () => {
  spareForm.ticketId = ticket.value!.id;
  spareForm.sparePartId = 0;
  spareForm.requestQty = 1;
  spareForm.fromStoreId = undefined;
  spareForm.remark = '';
  availabilityInfo.locations = [];
  loadSpareParts();
  sparePartDialogVisible.value = true;
};

const handleSpareRequest = async () => {
  if (!spareFormRef.value) return;
  await spareFormRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      await inventoryApi.createRequest(spareForm as any);
      ElMessage.success('备件申请已提交');
      sparePartDialogVisible.value = false;
      loadTicket();
    } finally {
      submitting.value = false;
    }
  });
};

const cancelSpareRequest = async (row: SparePartRequest) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入取消原因', '取消申请', {
      confirmButtonText: '确认取消',
      cancelButtonText: '返回',
    });
    await inventoryApi.cancelRequest(row.id, { remark: value });
    ElMessage.success('已取消');
    loadTicket();
  } catch {}
};

onMounted(loadTicket);
</script>

<style scoped>
.section-card {
  margin-bottom: 0;
}
.action-bar {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
