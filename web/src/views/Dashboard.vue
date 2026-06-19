<template>
  <div class="page-container">
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6" v-for="stat in statCards" :key="stat.label">
        <div class="stat-card" :style="{ borderTop: `3px solid ${stat.color}` }">
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 20px">
      <el-col :span="12">
        <div class="table-container">
          <h3 class="section-title">工单状态分布</h3>
          <div ref="statusChartRef" style="width: 100%; height: 320px"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="table-container">
          <h3 class="section-title">工单紧急程度</h3>
          <div ref="urgencyChartRef" style="width: 100%; height: 320px"></div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 20px">
      <el-col :span="12">
        <div class="table-container">
          <h3 class="section-title">近30天工单趋势</h3>
          <div ref="trendChartRef" style="width: 100%; height: 320px"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="table-container">
          <h3 class="section-title">库存预警</h3>
          <el-table :data="alerts" size="small" max-height="300">
            <el-table-column prop="partCode" label="备件编号" width="120" />
            <el-table-column prop="partName" label="备件名称" />
            <el-table-column prop="storeName" label="门店" width="100" />
            <el-table-column prop="quantity" label="库存" width="70" />
            <el-table-column prop="minStock" label="安全库存" width="80" />
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag type="danger" size="small">不足</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 20px" v-if="userStore.hasRole(['ADMIN'])">
      <el-col :span="24">
        <div class="table-container">
          <h3 class="section-title">维修员状态</h3>
          <el-table :data="techStats" size="small">
            <el-table-column prop="realName" label="维修员" width="100" />
            <el-table-column label="当前负载">
              <template #default="{ row }">
                <el-progress
                  :percentage="Math.round((row.currentLoad / row.maxLoad) * 100)"
                  :status="row.currentLoad >= row.maxLoad ? 'exception' : undefined"
                />
              </template>
            </el-table-column>
            <el-table-column prop="completedCount" label="已完成" width="80" />
            <el-table-column prop="rating" label="评分" width="80" />
            <el-table-column prop="regions" label="服务区域">
              <template #default="{ row }">
                <el-tag v-for="r in row.regions" :key="r" size="small" style="margin-right: 4px">
                  {{ r }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="skills" label="技能">
              <template #default="{ row }">
                <el-tag v-for="s in row.skills" :key="s" size="small" type="success" style="margin-right: 4px">
                  {{ s }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import * as echarts from 'echarts';
import { statsApi } from '@/api/log';
import { useUserStore } from '@/store/user';
import {
  TICKET_STATUS_LABEL,
  URGENCY_LABEL,
} from '@/constants';

const userStore = useUserStore();

const dashboard = ref<any>({});
const trendData = ref<any[]>([]);
const statusData = ref<any[]>([]);
const urgencyData = ref<any[]>([]);
const techStats = ref<any[]>([]);
const alerts = ref<any[]>([]);

const trendChartRef = ref<HTMLElement>();
const statusChartRef = ref<HTMLElement>();
const urgencyChartRef = ref<HTMLElement>();

const statCards = ref([
  { label: '总工单数', value: 0, color: '#409EFF' },
  { label: '进行中工单', value: 0, color: '#E6A23C' },
  { label: '今日新增', value: 0, color: '#67C23A' },
  { label: '今日完成', value: 0, color: '#F56C6C' },
]);

const loadData = async () => {
  const [dash, trend, status, urgency, tech, alert] = await Promise.all([
    statsApi.dashboard(),
    statsApi.ticketTrend({ days: 30 }),
    statsApi.ticketsByStatus(),
    statsApi.ticketsByUrgency(),
    statsApi.technicianStats().catch(() => ({ data: [] })),
    statsApi.inventoryAlert().catch(() => ({ data: [] })),
  ]);
  dashboard.value = dash.data;
  trendData.value = trend.data || [];
  statusData.value = status.data || [];
  urgencyData.value = urgency.data || [];
  techStats.value = tech.data || [];
  alerts.value = alert.data || [];

  statCards.value = [
    { label: '总工单数', value: dash.data.totalTickets || 0, color: '#409EFF' },
    { label: '进行中工单', value: dash.data.openTickets || 0, color: '#E6A23C' },
    { label: '今日新增', value: dash.data.todayTickets || 0, color: '#67C23A' },
    { label: '今日完成', value: dash.data.completedToday || 0, color: '#F56C6C' },
  ];

  await nextTick();
  renderCharts();
};

const renderCharts = () => {
  if (trendChartRef.value) {
    const chart = echarts.init(trendChartRef.value);
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['创建', '完成'] },
      grid: { left: 40, right: 20, top: 40, bottom: 30 },
      xAxis: {
        type: 'category',
        data: trendData.value.map((d) => d.date),
        axisLabel: { fontSize: 10 },
      },
      yAxis: { type: 'value' },
      series: [
        { name: '创建', type: 'line', data: trendData.value.map((d) => d.created), smooth: true, color: '#409EFF' },
        { name: '完成', type: 'line', data: trendData.value.map((d) => d.completed), smooth: true, color: '#67C23A' },
      ],
    });
  }

  if (statusChartRef.value) {
    const chart = echarts.init(statusChartRef.value);
    chart.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, type: 'scroll' },
      series: [
        {
          type: 'pie',
          radius: ['40%', '65%'],
          data: statusData.value.map((d) => ({
            name: TICKET_STATUS_LABEL[d.status as keyof typeof TICKET_STATUS_LABEL] || d.status,
            value: d.count,
          })),
          label: { fontSize: 11 },
        },
      ],
    });
  }

  if (urgencyChartRef.value) {
    const chart = echarts.init(urgencyChartRef.value);
    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 20, bottom: 30 },
      xAxis: {
        type: 'category',
        data: urgencyData.value.map((d) => URGENCY_LABEL[d.urgency as keyof typeof URGENCY_LABEL] || d.urgency),
      },
      yAxis: { type: 'value' },
      series: [
        {
          type: 'bar',
          data: urgencyData.value.map((d) => d.count),
          itemStyle: {
            color: (p: any) => ['#909399', '#E6A23C', '#F56C6C', '#C0392B'][p.dataIndex],
          },
          barWidth: '50%',
        },
      ],
    });
  }
};

onMounted(loadData);
</script>

<style scoped>
.stat-row {
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
}
</style>
