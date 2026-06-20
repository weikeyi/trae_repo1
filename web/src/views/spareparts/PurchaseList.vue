<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">补货建议 / 采购计划</h2>
      <div>
        <el-button type="primary" :icon="RefreshRight" @click="handleGenerateRestock" :loading="generating">
          生成补货建议
        </el-button>
        <el-button type="success" :icon="Plus" @click="openCreatePlanDialog" v-if="userStore.hasRole(['ADMIN', 'STORE_MANAGER'])">
          新建采购计划
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" type="card" class="main-tabs">
      <el-tab-pane label="补货建议" name="suggestions">
        <div class="filter-bar">
          <el-form :inline="true" :model="suggestionFilters">
            <el-form-item label="门店" v-if="userStore.hasRole(['ADMIN'])">
              <el-select v-model="suggestionFilters.storeId" placeholder="全部" clearable style="width: 160px">
                <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="优先级">
              <el-select v-model="suggestionFilters.priority" placeholder="全部" clearable style="width: 120px">
                <el-option v-for="(label, key) in RESTOCK_PRIORITY_LABEL" :key="key" :label="label" :value="key" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="suggestionFilters.status" placeholder="全部" clearable style="width: 140px">
                <el-option v-for="(label, key) in RESTOCK_STATUS_LABEL" :key="key" :label="label" :value="key" />
              </el-select>
            </el-form-item>
            <el-form-item label="关键字">
              <el-input v-model="suggestionFilters.keyword" placeholder="备件编号/名称" clearable style="width: 180px" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="loadSuggestions">查询</el-button>
              <el-button :icon="Refresh" @click="resetSuggestionFilters">重置</el-button>
            </el-form-item>
          </el-form>
        </div>

        <div class="table-container">
          <el-table :data="suggestions" v-loading="suggestionLoading" border stripe @selection-change="handleSuggestionSelection">
            <el-table-column type="selection" width="48" :selectable="isSuggestionSelectable" />
            <el-table-column label="优先级" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="RESTOCK_PRIORITY_TYPE[row.priority as RestockSuggestionPriority]" size="small">
                  {{ RESTOCK_PRIORITY_LABEL[row.priority as RestockSuggestionPriority] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="备件" width="180">
              <template #default="{ row }">
                <div>{{ row.sparePart?.partCode }}</div>
                <div style="color: #666; font-size: 12px">{{ row.sparePart?.name }}</div>
              </template>
            </el-table-column>
            <el-table-column label="门店" width="120">
              <template #default="{ row }">{{ row.store?.name }}</template>
            </el-table-column>
            <el-table-column prop="availableQty" label="可用" width="70" align="right" />
            <el-table-column prop="lockedQty" label="锁定" width="70" align="right" />
            <el-table-column prop="minStock" label="安全库存" width="80" align="right" />
            <el-table-column prop="pendingRequestQty" label="待申请" width="70" align="right" />
            <el-table-column prop="inTransitQty" label="在途" width="70" align="right" />
            <el-table-column prop="consumption30d" label="30天消耗" width="85" align="right" />
            <el-table-column prop="expectedGap" label="预计缺口" width="80" align="right">
              <template #default="{ row }">
                <span style="color: #F56C6C; font-weight: bold" v-if="row.expectedGap > 0">{{ row.expectedGap }}</span>
                <span v-else>0</span>
              </template>
            </el-table-column>
            <el-table-column prop="suggestedQty" label="建议补货" width="90" align="right">
              <template #default="{ row }">
                <span style="color: #409EFF; font-weight: bold">{{ row.suggestedQty }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="建议原因" min-width="160" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="RESTOCK_STATUS_TYPE[row.status as RestockSuggestionStatus]" size="small">
                  {{ RESTOCK_STATUS_LABEL[row.status as RestockSuggestionStatus] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  @click="convertSingleSuggestion(row)"
                  v-if="row.status === 'PENDING' && userStore.hasRole(['ADMIN', 'STORE_MANAGER'])"
                >生成计划</el-button>
                <el-button
                  link
                  type="info"
                  @click="dismissSuggestion(row)"
                  v-if="row.status === 'PENDING'"
                >忽略</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-container">
            <el-pagination
              v-model:current-page="suggestionPagination.page"
              v-model:page-size="suggestionPagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="suggestionPagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="loadSuggestions"
              @current-change="loadSuggestions"
            />
          </div>

          <div v-if="selectedSuggestionIds.length > 0" class="batch-action-bar">
            <span>已选 {{ selectedSuggestionIds.length }} 条</span>
            <el-button
              type="primary"
              :icon="Goods"
              @click="convertBatchSuggestions"
              v-if="userStore.hasRole(['ADMIN', 'STORE_MANAGER'])"
            >批量生成采购计划</el-button>
            <el-button @click="clearSuggestionSelection">取消选择</el-button>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="采购计划" name="plans">
        <div class="filter-bar">
          <el-form :inline="true" :model="planFilters">
            <el-form-item label="门店" v-if="userStore.hasRole(['ADMIN'])">
              <el-select v-model="planFilters.storeId" placeholder="全部" clearable style="width: 160px">
                <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="planFilters.status" placeholder="全部" clearable style="width: 130px">
                <el-option v-for="(label, key) in PURCHASE_PLAN_STATUS_LABEL" :key="key" :label="label" :value="key" />
              </el-select>
            </el-form-item>
            <el-form-item label="关键字">
              <el-input v-model="planFilters.keyword" placeholder="计划编号/备件名称" clearable style="width: 180px" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="loadPlans">查询</el-button>
              <el-button :icon="Refresh" @click="resetPlanFilters">重置</el-button>
            </el-form-item>
          </el-form>
        </div>

        <div class="table-container">
          <el-table :data="plans" v-loading="planLoading" border stripe>
            <el-table-column prop="planNo" label="计划编号" width="160" />
            <el-table-column label="门店" width="120">
              <template #default="{ row }">{{ row.store?.name }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="PURCHASE_PLAN_STATUS_TYPE[row.status as PurchasePlanStatus]" size="small">
                  {{ PURCHASE_PLAN_STATUS_LABEL[row.status as PurchasePlanStatus] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="备件明细" min-width="260">
              <template #default="{ row }">
                <div v-for="item in (row.items || []).slice(0, 3)" :key="item.id" class="plan-item-line">
                  <span>{{ item.sparePart?.name || item.sparePartId }}</span>
                  <span style="margin-left: 8px; color: #409EFF">x{{ item.planQty }}</span>
                  <span v-if="item.receivedQty > 0" style="margin-left: 8px; color: #67C23A">
                    已入{{ item.receivedQty }}
                  </span>
                </div>
                <div v-if="(row.items || []).length > 3" style="color: #909399; font-size: 12px">
                  ...共{{ row.items?.length }}项
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="totalQty" label="总数量" width="80" align="right" />
            <el-table-column label="入库进度" width="130">
              <template #default="{ row }">
                <el-progress
                  :percentage="row.totalQty > 0 ? Math.round(row.receivedQty / row.totalQty * 100) : 0"
                  :stroke-width="14"
                />
              </template>
            </el-table-column>
            <el-table-column label="创建人" width="90">
              <template #default="{ row }">{{ row.createdBy?.realName }}</template>
            </el-table-column>
            <el-table-column label="创建时间" width="160">
              <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="viewPlan(row)">详情</el-button>
                <el-button
                  link
                  type="warning"
                  @click="editPlan(row)"
                  v-if="row.status === 'DRAFT' && userStore.hasRole(['ADMIN', 'STORE_MANAGER'])"
                >编辑</el-button>
                <el-button
                  link
                  type="primary"
                  @click="submitPlan(row)"
                  v-if="row.status === 'DRAFT' && userStore.hasRole(['ADMIN', 'STORE_MANAGER'])"
                >提交</el-button>
                <el-button
                  link
                  type="success"
                  @click="approvePlan(row)"
                  v-if="row.status === 'SUBMITTED' && userStore.hasRole(['ADMIN'])"
                >审批</el-button>
                <el-button
                  link
                  type="danger"
                  @click="rejectPlan(row)"
                  v-if="row.status === 'SUBMITTED' && userStore.hasRole(['ADMIN'])"
                >驳回</el-button>
                <el-button
                  link
                  type="info"
                  @click="cancelPlan(row)"
                  v-if="['DRAFT','SUBMITTED','APPROVED'].includes(row.status) && userStore.hasRole(['ADMIN', 'STORE_MANAGER'])"
                >取消</el-button>
                <el-button
                  link
                  type="success"
                  @click="openReceiptDialog(row)"
                  v-if="['APPROVED','PARTIAL_RECEIVED'].includes(row.status) && userStore.hasRole(['ADMIN', 'STORE_MANAGER'])"
                >入库</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-container">
            <el-pagination
              v-model:current-page="planPagination.page"
              v-model:page-size="planPagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="planPagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="loadPlans"
              @current-change="loadPlans"
            />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="planDetailVisible" title="采购计划详情" width="800px" @close="currentPlan = null">
      <div v-if="currentPlan" class="plan-detail">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="计划编号">{{ currentPlan.planNo }}</el-descriptions-item>
          <el-descriptions-item label="门店">{{ currentPlan.store?.name }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="PURCHASE_PLAN_STATUS_TYPE[currentPlan.status]">{{ PURCHASE_PLAN_STATUS_LABEL[currentPlan.status] }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="总数量">{{ currentPlan.totalQty }} / 已入库 {{ currentPlan.receivedQty }}</el-descriptions-item>
          <el-descriptions-item label="创建人">{{ currentPlan.createdBy?.realName }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(currentPlan.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentPlan.remark || '-' }}</el-descriptions-item>
          <el-descriptions-item v-if="currentPlan.rejectReason" label="驳回原因" :span="2" style="color: #F56C6C">
            {{ currentPlan.rejectReason }}
          </el-descriptions-item>
          <el-descriptions-item v-if="currentPlan.cancelReason" label="取消原因" :span="2" style="color: #909399">
            {{ currentPlan.cancelReason }}
          </el-descriptions-item>
        </el-descriptions>

        <h4 style="margin: 16px 0 8px">采购明细</h4>
        <el-table :data="currentPlan.items" border stripe size="small">
          <el-table-column label="备件" width="180">
            <template #default="{ row }">
              <div>{{ row.sparePart?.partCode }}</div>
              <div style="color: #666; font-size: 12px">{{ row.sparePart?.name }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="planQty" label="计划数量" width="90" align="right" />
          <el-table-column prop="receivedQty" label="已入库" width="80" align="right" />
          <el-table-column label="剩余" width="80" align="right">
            <template #default="{ row }">
              <span style="color: #409EFF; font-weight: bold">{{ row.planQty - row.receivedQty }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
        </el-table>

        <h4 v-if="currentPlan.receipts?.length" style="margin: 16px 0 8px">入库记录</h4>
        <el-table v-if="currentPlan.receipts?.length" :data="currentPlan.receipts" border stripe size="small">
          <el-table-column prop="receiptNo" label="入库单号" width="160" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="PURCHASE_RECEIPT_STATUS_TYPE[row.status as PurchaseReceiptStatus]" size="small">
                {{ PURCHASE_RECEIPT_STATUS_LABEL[row.status as PurchaseReceiptStatus] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="入库明细" min-width="200">
            <template #default="{ row }">
              <div v-for="item in row.items || []" :key="item.id" class="plan-item-line">
                <span>{{ item.sparePart?.name }}</span>
                <span style="margin-left: 8px; color: #67C23A">x{{ item.quantity }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="totalQty" label="总数量" width="80" align="right" />
          <el-table-column label="确认人" width="90">
            <template #default="{ row }">{{ row.confirmedBy?.realName || '-' }}</template>
          </el-table-column>
          <el-table-column label="确认时间" width="160">
            <template #default="{ row }">{{ row.confirmedAt ? formatTime(row.confirmedAt) : '-' }}</template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <el-dialog v-model="createPlanVisible" title="新建采购计划" width="700px" @close="resetPlanForm">
      <el-form ref="planFormRef" :model="planForm" :rules="planRules" label-width="100px">
        <el-form-item label="门店" prop="storeId" v-if="userStore.hasRole(['ADMIN'])">
          <el-select v-model="planForm.storeId" placeholder="请选择门店" style="width: 100%">
            <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="门店" v-else>
          <span>{{ userStore.userInfo?.store?.name || '-' }}</span>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="planForm.remark" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="采购明细" prop="items">
          <div class="plan-items-editor">
            <el-table :data="planForm.items" border size="small">
              <el-table-column label="备件" width="220">
                <template #default="{ row, $index }">
                  <el-select
                    v-model="row.sparePartId"
                    placeholder="选择备件"
                    filterable
                    style="width: 100%"
                  >
                    <el-option
                      v-for="sp in spareParts"
                      :key="sp.id"
                      :label="`${sp.partCode} - ${sp.name}`"
                      :value="sp.id"
                    />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="数量" width="140">
                <template #default="{ row }">
                  <el-input-number v-model="row.planQty" :min="1" style="width: 100%" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="70" align="center">
                <template #default="{ $index }">
                  <el-button link type="danger" @click="removePlanItem($index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-button type="primary" link :icon="Plus" style="margin-top: 8px" @click="addPlanItem">添加明细</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createPlanVisible = false">取消</el-button>
        <el-button type="primary" :loading="planSubmitting" @click="submitCreatePlan">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editPlanVisible" title="编辑采购计划" width="700px" @close="resetEditPlan">
      <el-form ref="editPlanFormRef" :model="editPlanForm" label-width="100px">
        <el-form-item label="计划编号">{{ editingPlan?.planNo }}</el-form-item>
        <el-form-item label="门店">{{ editingPlan?.store?.name }}</el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editPlanForm.remark" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="采购明细">
          <div class="plan-items-editor">
            <el-table :data="editPlanForm.items" border size="small">
              <el-table-column label="备件" width="220">
                <template #default="{ row, $index }">
                  <el-select v-model="row.sparePartId" placeholder="选择备件" filterable style="width: 100%">
                    <el-option
                      v-for="sp in spareParts"
                      :key="sp.id"
                      :label="`${sp.partCode} - ${sp.name}`"
                      :value="sp.id"
                    />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="数量" width="140">
                <template #default="{ row }">
                  <el-input-number v-model="row.planQty" :min="1" style="width: 100%" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="70" align="center">
                <template #default="{ $index }">
                  <el-button link type="danger" @click="removeEditPlanItem($index)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-button type="primary" link :icon="Plus" style="margin-top: 8px" @click="addEditPlanItem">添加明细</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editPlanVisible = false">取消</el-button>
        <el-button type="primary" :loading="editPlanSubmitting" @click="submitEditPlan">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="receiptDialogVisible" title="采购入库" width="720px" @close="resetReceiptForm">
      <div v-if="receiptPlan">
        <el-alert type="info" :closable="false" style="margin-bottom: 12px">
          <template #title>
            计划号: {{ receiptPlan.planNo }} | 门店: {{ receiptPlan.store?.name }}
          </template>
        </el-alert>
        <el-table :data="receiptItems" border size="small" ref="receiptTableRef">
          <el-table-column label="备件" width="200">
            <template #default="{ row }">
              <div>{{ row.sparePart?.partCode }}</div>
              <div style="color: #666; font-size: 12px">{{ row.sparePart?.name }}</div>
            </template>
          </el-table-column>
          <el-table-column label="计划" width="80" align="right">
            <template #default="{ row }">{{ row.planQty }}</template>
          </el-table-column>
          <el-table-column label="已入" width="70" align="right">
            <template #default="{ row }">{{ row.receivedQty }}</template>
          </el-table-column>
          <el-table-column label="待入" width="70" align="right">
            <template #default="{ row }">
              <span style="color: #409EFF; font-weight: bold">{{ row.planQty - row.receivedQty }}</span>
            </template>
          </el-table-column>
          <el-table-column label="入库数量" width="180">
            <template #default="{ row }">
              <el-input-number
                v-model="row.inputQty"
                :min="0"
                :max="row.planQty - row.receivedQty"
                style="width: 100%"
              />
            </template>
          </el-table-column>
        </el-table>
        <el-form label-width="80px" style="margin-top: 12px">
          <el-form-item label="备注">
            <el-input v-model="receiptRemark" type="textarea" :rows="2" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="receiptDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="receiptSubmitting" @click="submitReceipt">确认入库</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rejectDialogVisible" title="驳回采购计划" width="450px">
      <el-form label-width="80px">
        <el-form-item label="驳回原因">
          <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请输入驳回原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="actionLoading" @click="submitRejectPlan">确认驳回</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="cancelDialogVisible" title="取消采购计划" width="450px">
      <el-form label-width="80px">
        <el-form-item label="取消原因">
          <el-input v-model="cancelReason" type="textarea" :rows="3" placeholder="请输入取消原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelDialogVisible = false">取消</el-button>
        <el-button type="warning" :loading="actionLoading" @click="submitCancelPlan">确认取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import {
  Search,
  Refresh,
  Plus,
  RefreshRight,
  Goods,
} from '@element-plus/icons-vue';
import {
  ElMessage,
  ElMessageBox,
  FormInstance,
  FormRules,
} from 'element-plus';
import dayjs from 'dayjs';
import { purchaseApi, type CreatePurchasePlanInput } from '@/api/purchase';
import { sparePartApi } from '@/api/inventory';
import { storeApi } from '@/api/store';
import {
  RESTOCK_PRIORITY_LABEL,
  RESTOCK_PRIORITY_TYPE,
  RESTOCK_STATUS_LABEL,
  RESTOCK_STATUS_TYPE,
  PURCHASE_PLAN_STATUS_LABEL,
  PURCHASE_PLAN_STATUS_TYPE,
  PURCHASE_RECEIPT_STATUS_LABEL,
  PURCHASE_RECEIPT_STATUS_TYPE,
} from '@/constants';
import { useUserStore } from '@/store/user';
import type {
  RestockSuggestion,
  PurchasePlan,
  PurchasePlanItem,
  SparePart,
  Store,
  PurchasePlanStatus,
  RestockSuggestionPriority,
  RestockSuggestionStatus,
  PurchaseReceiptStatus,
} from '@/types';

const userStore = useUserStore();
const formatTime = (val: string) => (val ? dayjs(val).format('YYYY-MM-DD HH:mm:ss') : '-');

const activeTab = ref('suggestions');

// ============= 门店和备件 =============
const stores = ref<Store[]>([]);
const spareParts = ref<SparePart[]>([]);
const loadStores = async () => {
  const res = await storeApi.list({ pageSize: 999 });
  stores.value = res.data!.data;
};
const loadSpareParts = async () => {
  const res = await sparePartApi.list({ pageSize: 999 });
  spareParts.value = res.data!.data;
};

// ============= 补货建议 =============
const generating = ref(false);
const suggestionLoading = ref(false);
const suggestions = ref<RestockSuggestion[]>([]);
const selectedSuggestionIds = ref<number[]>([]);
const suggestionFilters = reactive({
  storeId: undefined as number | undefined,
  priority: undefined as RestockSuggestionPriority | undefined,
  status: undefined as RestockSuggestionStatus | undefined,
  keyword: '',
});
const suggestionPagination = reactive({ page: 1, pageSize: 20, total: 0 });

const isSuggestionSelectable = (row: RestockSuggestion) =>
  row.status === 'PENDING';

const handleSuggestionSelection = (rows: RestockSuggestion[]) => {
  selectedSuggestionIds.value = rows.map((r) => r.id);
};
const clearSuggestionSelection = () => {
  selectedSuggestionIds.value = [];
  (document.querySelector('.main-tabs .el-table') as any)?.clearSelection?.();
};

const loadSuggestions = async () => {
  suggestionLoading.value = true;
  try {
    const res = await purchaseApi.listRestockSuggestions({
      page: suggestionPagination.page,
      pageSize: suggestionPagination.pageSize,
      storeId:
        userStore.userInfo?.role === 'STORE_MANAGER'
          ? userStore.userInfo.storeId || undefined
          : suggestionFilters.storeId,
      priority: suggestionFilters.priority,
      status: suggestionFilters.status,
      keyword: suggestionFilters.keyword,
    });
    suggestions.value = res.data!.data;
    suggestionPagination.total = res.data!.total;
  } finally {
    suggestionLoading.value = false;
  }
};

const resetSuggestionFilters = () => {
  suggestionFilters.storeId = undefined;
  suggestionFilters.priority = undefined;
  suggestionFilters.status = undefined;
  suggestionFilters.keyword = '';
  suggestionPagination.page = 1;
  loadSuggestions();
};

const handleGenerateRestock = async () => {
  generating.value = true;
  try {
    const storeId =
      userStore.userInfo?.role === 'STORE_MANAGER'
        ? userStore.userInfo.storeId || undefined
        : undefined;
    const res = await purchaseApi.generateRestockSuggestions({ storeId, force: true });
    ElMessage.success(res.message || `已生成 ${res.data?.count || 0} 条补货建议`);
    loadSuggestions();
  } finally {
    generating.value = false;
  }
};

const dismissSuggestion = async (row: RestockSuggestion) => {
  await ElMessageBox.confirm('确认忽略该补货建议？', '提示', { type: 'warning' });
  await purchaseApi.dismissRestockSuggestion(row.id);
  ElMessage.success('已忽略');
  loadSuggestions();
};

const convertSingleSuggestion = (row: RestockSuggestion) => {
  convertSuggestionBatch([row.id]);
};

const convertBatchSuggestions = () => {
  if (selectedSuggestionIds.value.length === 0) {
    ElMessage.warning('请先选择补货建议');
    return;
  }
  convertSuggestionBatch(selectedSuggestionIds.value);
};

const convertSuggestionBatch = async (ids: number[]) => {
  try {
    const res = await purchaseApi.createPlanFromSuggestions({ suggestionIds: ids });
    ElMessage.success('采购计划创建成功');
    loadSuggestions();
    activeTab.value = 'plans';
    setTimeout(() => loadPlans(), 100);
  } catch (e: any) {
    // error handled by interceptor
  }
};

// ============= 采购计划 =============
const planLoading = ref(false);
const plans = ref<PurchasePlan[]>([]);
const planFilters = reactive({
  storeId: undefined as number | undefined,
  status: undefined as PurchasePlanStatus | undefined,
  keyword: '',
});
const planPagination = reactive({ page: 1, pageSize: 20, total: 0 });

const loadPlans = async () => {
  planLoading.value = true;
  try {
    const res = await purchaseApi.listPurchasePlans({
      page: planPagination.page,
      pageSize: planPagination.pageSize,
      storeId:
        userStore.userInfo?.role === 'STORE_MANAGER'
          ? userStore.userInfo.storeId || undefined
          : planFilters.storeId,
      status: planFilters.status,
      keyword: planFilters.keyword,
    });
    plans.value = res.data!.data;
    planPagination.total = res.data!.total;
  } finally {
    planLoading.value = false;
  }
};

const resetPlanFilters = () => {
  planFilters.storeId = undefined;
  planFilters.status = undefined;
  planFilters.keyword = '';
  planPagination.page = 1;
  loadPlans();
};

// ====== 详情 ======
const planDetailVisible = ref(false);
const currentPlan = ref<PurchasePlan | null>(null);
const viewPlan = async (row: PurchasePlan) => {
  const res = await purchaseApi.getPurchasePlan(row.id);
  currentPlan.value = res.data!;
  planDetailVisible.value = true;
};

// ====== 新建计划 ======
const createPlanVisible = ref(false);
const planFormRef = ref<FormInstance>();
const planSubmitting = ref(false);
const planForm = reactive<CreatePurchasePlanInput>({
  storeId: 0,
  items: [{ sparePartId: 0, planQty: 1 }],
  remark: '',
});
const planRules: FormRules = {
  storeId: [{ required: true, message: '请选择门店', trigger: 'change' }],
  items: [
    {
      validator: (_r, v, cb) => {
        if (!Array.isArray(v) || v.length === 0) cb(new Error('请添加采购明细'));
        else if (v.some((x: any) => !x.sparePartId || x.planQty <= 0)) cb(new Error('请完善采购明细'));
        else cb();
      },
      trigger: 'change',
    },
  ],
};

const openCreatePlanDialog = () => {
  if (userStore.userInfo?.role === 'STORE_MANAGER') {
    planForm.storeId = userStore.userInfo.storeId || 0;
  }
  createPlanVisible.value = true;
};
const addPlanItem = () => planForm.items.push({ sparePartId: 0, planQty: 1 });
const removePlanItem = (idx: number) => planForm.items.splice(idx, 1);
const resetPlanForm = () => {
  planForm.storeId = 0;
  planForm.items = [{ sparePartId: 0, planQty: 1 }];
  planForm.remark = '';
};

const submitCreatePlan = async () => {
  if (!planFormRef.value) return;
  await planFormRef.value.validate(async (valid) => {
    if (!valid) return;
    planSubmitting.value = true;
    try {
      await purchaseApi.createPurchasePlan({
        storeId: planForm.storeId || (userStore.userInfo?.storeId as number),
        items: planForm.items,
        remark: planForm.remark,
      });
      ElMessage.success('创建成功');
      createPlanVisible.value = false;
      loadPlans();
    } finally {
      planSubmitting.value = false;
    }
  });
};

// ====== 编辑计划 ======
const editPlanVisible = ref(false);
const editPlanFormRef = ref<FormInstance>();
const editPlanSubmitting = ref(false);
const editingPlan = ref<PurchasePlan | null>(null);
const editPlanForm = reactive({
  items: [] as Array<{ sparePartId: number; planQty: number; unitPrice?: number; remark?: string }>,
  remark: '',
});

const editPlan = (row: PurchasePlan) => {
  editingPlan.value = row;
  editPlanForm.items =
    row.items?.map((i) => ({
      sparePartId: i.sparePartId,
      planQty: i.planQty,
      unitPrice: i.unitPrice || 0,
      remark: i.remark || '',
    })) || [];
  editPlanForm.remark = row.remark || '';
  editPlanVisible.value = true;
};
const addEditPlanItem = () => editPlanForm.items.push({ sparePartId: 0, planQty: 1 });
const removeEditPlanItem = (idx: number) => editPlanForm.items.splice(idx, 1);
const resetEditPlan = () => {
  editingPlan.value = null;
  editPlanForm.items = [];
  editPlanForm.remark = '';
};

const submitEditPlan = async () => {
  if (!editingPlan.value) return;
  if (!editPlanForm.items.length || editPlanForm.items.some((x) => !x.sparePartId || x.planQty <= 0)) {
    ElMessage.warning('请完善采购明细');
    return;
  }
  editPlanSubmitting.value = true;
  try {
    await purchaseApi.updatePurchasePlanItems(editingPlan.value.id, {
      items: editPlanForm.items,
      remark: editPlanForm.remark,
    });
    ElMessage.success('保存成功');
    editPlanVisible.value = false;
    loadPlans();
  } finally {
    editPlanSubmitting.value = false;
  }
};

// ====== 计划操作 ======
const actionLoading = ref(false);
const rejectDialogVisible = ref(false);
const rejectReason = ref('');
const rejectingPlan = ref<PurchasePlan | null>(null);
const cancelDialogVisible = ref(false);
const cancelReason = ref('');
const cancellingPlan = ref<PurchasePlan | null>(null);

const submitPlan = async (row: PurchasePlan) => {
  await ElMessageBox.confirm('确认提交该采购计划？提交后将进入审批流程。', '提示', { type: 'info' });
  await purchaseApi.submitPurchasePlan(row.id);
  ElMessage.success('已提交');
  loadPlans();
};

const approvePlan = async (row: PurchasePlan) => {
  await ElMessageBox.confirm('确认批准该采购计划？', '审批', { type: 'success' });
  await purchaseApi.approvePurchasePlan(row.id);
  ElMessage.success('已批准');
  loadPlans();
};

const rejectPlan = (row: PurchasePlan) => {
  rejectingPlan.value = row;
  rejectReason.value = '';
  rejectDialogVisible.value = true;
};
const submitRejectPlan = async () => {
  if (!rejectingPlan.value || !rejectReason.value.trim()) {
    ElMessage.warning('请填写驳回原因');
    return;
  }
  actionLoading.value = true;
  try {
    await purchaseApi.rejectPurchasePlan(rejectingPlan.value.id, { rejectReason: rejectReason.value });
    ElMessage.success('已驳回');
    rejectDialogVisible.value = false;
    loadPlans();
  } finally {
    actionLoading.value = false;
  }
};

const cancelPlan = (row: PurchasePlan) => {
  cancellingPlan.value = row;
  cancelReason.value = '';
  cancelDialogVisible.value = true;
};
const submitCancelPlan = async () => {
  if (!cancellingPlan.value || !cancelReason.value.trim()) {
    ElMessage.warning('请填写取消原因');
    return;
  }
  actionLoading.value = true;
  try {
    await purchaseApi.cancelPurchasePlan(cancellingPlan.value.id, { cancelReason: cancelReason.value });
    ElMessage.success('已取消');
    cancelDialogVisible.value = false;
    loadPlans();
  } finally {
    actionLoading.value = false;
  }
};

// ====== 入库 ======
const receiptDialogVisible = ref(false);
const receiptSubmitting = ref(false);
const receiptPlan = ref<PurchasePlan | null>(null);
type ReceiptItemRow = PurchasePlanItem & { inputQty: number };
const receiptItems = ref<ReceiptItemRow[]>([]);
const receiptRemark = ref('');

const openReceiptDialog = async (row: PurchasePlan) => {
  const detailRes = await purchaseApi.getPurchasePlan(row.id);
  receiptPlan.value = detailRes.data!;
  receiptItems.value = (detailRes.data!.items || []).map((i) => ({
    ...i,
    inputQty: Math.max(0, Math.min(i.planQty - i.receivedQty, i.planQty - i.receivedQty > 0 ? i.planQty - i.receivedQty : 0)),
  }));
  receiptRemark.value = '';
  receiptDialogVisible.value = true;
};
const resetReceiptForm = () => {
  receiptPlan.value = null;
  receiptItems.value = [];
  receiptRemark.value = '';
};

const submitReceipt = async () => {
  if (!receiptPlan.value) return;
  const validItems = receiptItems.value.filter((i) => i.inputQty > 0);
  if (validItems.length === 0) {
    ElMessage.warning('请至少填写一个入库数量');
    return;
  }
  for (const item of receiptItems.value) {
    if (item.inputQty > item.planQty - item.receivedQty) {
      ElMessage.warning(`备件入库数量超过剩余待入库数量`);
      return;
    }
  }
  receiptSubmitting.value = true;
  try {
    const createRes = await purchaseApi.createPurchaseReceipt({
      planId: receiptPlan.value.id,
      items: validItems.map((i) => ({
        planItemId: i.id,
        quantity: i.inputQty,
      })),
      remark: receiptRemark.value,
    });
    await purchaseApi.confirmPurchaseReceipt(createRes.data!.id);
    ElMessage.success('入库成功');
    receiptDialogVisible.value = false;
    loadPlans();
  } finally {
    receiptSubmitting.value = false;
  }
};

onMounted(() => {
  loadStores();
  loadSpareParts();
  loadSuggestions();
  loadPlans();
});
</script>

<style scoped>
.page-container {
  padding: 16px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-title {
  margin: 0;
  font-size: 20px;
  color: #303133;
}
.filter-bar {
  background: #fff;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.table-container {
  background: #fff;
  padding: 16px;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
.batch-action-bar {
  margin-top: 12px;
  padding: 10px 16px;
  background: #ECF5FF;
  border: 1px solid #D9ECFF;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.main-tabs {
  background: #fff;
  padding: 12px 16px;
  border-radius: 6px;
}
.plan-item-line {
  font-size: 13px;
  line-height: 1.6;
}
.plan-items-editor {
  width: 100%;
}
.plan-detail h4 {
  margin: 16px 0 8px;
  color: #303133;
}
</style>
