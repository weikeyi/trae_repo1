import request from 'supertest';
import app from '../src/index';
import prisma from '../src/config/prisma';
import { hashPassword, generateToken } from '../src/utils/auth';
import { Role, UrgencyLevel, TicketStatus, toJsonArray } from '../src/constants/enums';

let adminToken: string;
let storeToken: string;
let techToken: string;
let adminId: number;
let storeId: number;
let techId: number;
let testStoreId: number;
let testEquipmentId: number;
let testEquipment2Id: number;
let testEquipment3Id: number;

beforeAll(async () => {
  await prisma.$connect();

  await prisma.transfer.deleteMany({});
  await prisma.sparePartRequest.deleteMany({});
  await prisma.statusHistory.deleteMany({});
  await prisma.repairTicket.deleteMany({});
  await prisma.operationLog.deleteMany({});
  await prisma.inventoryLog.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.sparePart.deleteMany({});
  await prisma.equipment.deleteMany({});

  const adminPwd = await hashPassword('admin123');
  const storePwd = await hashPassword('store123');
  const techPwd = await hashPassword('tech123');

  const admin = await prisma.user.upsert({
    where: { username: 'testadmin' },
    update: {},
    create: {
      username: 'testadmin',
      passwordHash: adminPwd,
      realName: '测试管理员',
      role: Role.ADMIN,
    },
  });
  adminId = admin.id;
  adminToken = generateToken({ userId: admin.id, username: admin.username, role: admin.role as Role });

  const testStore = await prisma.store.upsert({
    where: { storeCode: 'TEST001' },
    update: {},
    create: {
      storeCode: 'TEST001',
      name: '测试门店',
      address: '测试地址',
      region: '测试区域',
    },
  });
  testStoreId = testStore.id;

  const store = await prisma.user.upsert({
    where: { username: 'teststore' },
    update: {},
    create: {
      username: 'teststore',
      passwordHash: storePwd,
      realName: '测试店长',
      role: Role.STORE_MANAGER,
      storeId: testStore.id,
    },
  });
  storeId = store.id;
  storeToken = generateToken({ userId: store.id, username: store.username, role: store.role as Role, storeId: store.storeId });

  const tech = await prisma.user.upsert({
    where: { username: 'testtech' },
    update: { isActive: true },
    create: {
      username: 'testtech',
      passwordHash: techPwd,
      realName: '测试维修员',
      role: Role.TECHNICIAN,
      technician: {
        create: {
          skills: toJsonArray(['空调维修', '制冷故障', '电路故障', '漏水']),
          regions: toJsonArray(['测试区域']),
          maxLoad: 10,
        },
      },
    },
  });
  techId = tech.id;
  techToken = generateToken({ userId: tech.id, username: tech.username, role: tech.role as Role });

  const eq1 = await prisma.equipment.upsert({
    where: { equipmentCode: 'TEST-EQ-001' },
    update: {},
    create: {
      equipmentCode: 'TEST-EQ-001',
      name: '测试设备1',
      category: '测试分类',
      storeId: testStore.id,
    },
  });
  testEquipmentId = eq1.id;

  const eq2 = await prisma.equipment.upsert({
    where: { equipmentCode: 'TEST-EQ-002' },
    update: {},
    create: {
      equipmentCode: 'TEST-EQ-002',
      name: '测试设备2',
      category: '测试分类',
      storeId: testStore.id,
    },
  });
  testEquipment2Id = eq2.id;

  const eq3 = await prisma.equipment.upsert({
    where: { equipmentCode: 'TEST-EQ-003' },
    update: {},
    create: {
      equipmentCode: 'TEST-EQ-003',
      name: '测试设备3',
      category: '测试分类',
      storeId: testStore.id,
    },
  });
  testEquipment3Id = eq3.id;

  await prisma.slaRule.deleteMany({});
  await prisma.slaRule.create({
    data: {
      urgency: UrgencyLevel.MEDIUM,
      responseMinutes: 120,
      resolutionMinutes: 1440,
      escalationMinutes: 720,
    },
  });
  await prisma.slaRule.create({
    data: {
      urgency: UrgencyLevel.LOW,
      responseMinutes: 0,
      resolutionMinutes: 1,
      escalationMinutes: 0,
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Auth API', () => {
  it('POST /api/auth/login should login successfully', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testadmin', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('POST /api/auth/login should fail with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testadmin', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('User API', () => {
  it('GET /api/users/me should return current user', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('testadmin');
  });

  it('GET /api/users should require admin', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${storeToken}`);

    expect(res.status).toBe(403);
  });

  it('POST /api/users should create a new user', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'newuser' + Date.now(),
        password: 'test123',
        realName: '新用户',
        role: Role.STORE_MANAGER,
        storeId: testStoreId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.realName).toBe('新用户');
  });
});

describe('Store API', () => {
  it('GET /api/stores should list stores', async () => {
    const res = await request(app)
      .get('/api/stores')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.data.length).toBeGreaterThan(0);
  });
});

describe('Equipment API', () => {
  it('GET /api/equipments should list equipments', async () => {
    const res = await request(app)
      .get('/api/equipments')
      .set('Authorization', `Bearer ${storeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.data.length).toBeGreaterThan(0);
  });
});

describe('Ticket API', () => {
  let createdTicketId: number;

  it('POST /api/tickets should create a ticket', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${storeToken}`)
      .send({
        equipmentId: testEquipmentId,
        faultType: '空调维修',
        description: '空调不制冷需要检修',
        urgency: UrgencyLevel.MEDIUM,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.faultType).toBe('空调维修');
    createdTicketId = res.body.data.id;
  });

  it('GET /api/tickets should list tickets', async () => {
    const res = await request(app)
      .get('/api/tickets')
      .set('Authorization', `Bearer ${storeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThan(0);
  });

  it('POST /api/tickets/:id/assign should assign ticket to technician', async () => {
    await prisma.technicianProfile.update({
      where: { userId: techId },
      data: { currentLoad: 0 },
    });
    const res = await request(app)
      .post(`/api/tickets/${createdTicketId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ technicianId: techId });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ASSIGNED');
  });
});

describe('Stats API', () => {
  it('GET /api/stats/dashboard should return dashboard stats', async () => {
    const res = await request(app)
      .get('/api/stats/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalTickets).toBeDefined();
  });
});

describe('Ticket Cancel & Inventory Release', () => {
  it('should release locked inventory when ticket is cancelled', async () => {
    await prisma.technicianProfile.update({
      where: { userId: techId },
      data: { currentLoad: 0 },
    });
    const sparePart = await prisma.sparePart.upsert({
      where: { partCode: 'TEST-SP-001' },
      update: {},
      create: {
        partCode: 'TEST-SP-001',
        name: '测试备件',
        category: '测试',
        unit: '个',
      },
    });

    const inventory = await prisma.inventory.upsert({
      where: { sparePartId_storeId: { sparePartId: sparePart.id, storeId: testStoreId } },
      update: { quantity: 10, lockedQty: 0, availableQty: 10, minStock: 2 },
      create: {
        sparePartId: sparePart.id,
        storeId: testStoreId,
        quantity: 10,
        lockedQty: 0,
        availableQty: 10,
        minStock: 2,
      },
    });

    const ticket = await prisma.repairTicket.create({
      data: {
        ticketNo: `WO-CANCEL-${Date.now()}`,
        equipmentId: testEquipment2Id,
        storeId: testStoreId,
        faultType: '制冷故障',
        description: '测试取消释放库存',
        imageUrls: '[]',
        urgency: UrgencyLevel.MEDIUM,
        status: TicketStatus.CREATED,
        createdById: storeId,
      },
    });
    const ticketId = ticket.id;

    await prisma.statusHistory.create({
      data: {
        ticketId,
        toStatus: TicketStatus.CREATED,
        operatorId: storeId,
        remark: '创建工单',
      },
    });

    await request(app)
      .post(`/api/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ technicianId: techId });

    await request(app)
      .post(`/api/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ status: 'TECHNICIAN_ON_WAY' });

    await request(app)
      .post(`/api/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ status: 'DIAGNOSING' });

    const requestRes = await request(app)
      .post('/api/inventories/requests')
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        ticketId,
        sparePartId: sparePart.id,
        requestQty: 3,
        fromStoreId: testStoreId,
      });

    expect(requestRes.status).toBe(201);

    const invAfterLock = await prisma.inventory.findUnique({ where: { id: inventory.id } });
    expect(invAfterLock!.lockedQty).toBe(3);
    expect(invAfterLock!.availableQty).toBe(7);

    const cancelRes = await request(app)
      .post(`/api/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CANCELLED' });

    expect(cancelRes.status).toBe(200);

    const invAfterCancel = await prisma.inventory.findUnique({ where: { id: inventory.id } });
    expect(invAfterCancel!.lockedQty).toBe(0);
    expect(invAfterCancel!.availableQty).toBe(10);
  });

  it('should generate REQUEST_RELEASE inventory log when cancelling ticket with locked inventory', async () => {
    await prisma.technicianProfile.update({
      where: { userId: techId },
      data: { currentLoad: 0 },
    });

    const logSparePart = await prisma.sparePart.upsert({
      where: { partCode: 'TEST-SP-LOG' },
      update: {},
      create: {
        partCode: 'TEST-SP-LOG',
        name: '流水测试备件',
        category: '测试',
        unit: '个',
      },
    });

    await prisma.inventory.upsert({
      where: { sparePartId_storeId: { sparePartId: logSparePart.id, storeId: testStoreId } },
      update: { quantity: 15, lockedQty: 0, availableQty: 15, minStock: 3 },
      create: {
        sparePartId: logSparePart.id,
        storeId: testStoreId,
        quantity: 15,
        lockedQty: 0,
        availableQty: 15,
        minStock: 3,
      },
    });

    const logTicket = await prisma.repairTicket.create({
      data: {
        ticketNo: `WO-CANCEL-LOG-${Date.now()}`,
        equipmentId: testEquipment2Id,
        storeId: testStoreId,
        faultType: '电路故障',
        description: '测试取消工单流水',
        imageUrls: '[]',
        urgency: UrgencyLevel.MEDIUM,
        status: TicketStatus.CREATED,
        createdById: storeId,
      },
    });

    await prisma.statusHistory.create({
      data: {
        ticketId: logTicket.id,
        toStatus: TicketStatus.CREATED,
        operatorId: storeId,
        remark: '创建工单',
      },
    });

    await request(app)
      .post(`/api/tickets/${logTicket.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ technicianId: techId });

    await request(app)
      .post(`/api/tickets/${logTicket.id}/status`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ status: 'TECHNICIAN_ON_WAY' });

    await request(app)
      .post(`/api/tickets/${logTicket.id}/status`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ status: 'DIAGNOSING' });

    const reqRes = await request(app)
      .post('/api/inventories/requests')
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        ticketId: logTicket.id,
        sparePartId: logSparePart.id,
        requestQty: 4,
        fromStoreId: testStoreId,
      });
    expect(reqRes.status).toBe(201);
    const requestId = reqRes.body.data.id;

    const logsBeforeCancel = await prisma.inventoryLog.count({
      where: {
        sparePartId: logSparePart.id,
        storeId: testStoreId,
        changeType: 'REQUEST_RELEASE',
      },
    });

    const cancelRes = await request(app)
      .post(`/api/tickets/${logTicket.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CANCELLED' });
    expect(cancelRes.status).toBe(200);

    const releaseLogs = await prisma.inventoryLog.findMany({
      where: {
        sparePartId: logSparePart.id,
        storeId: testStoreId,
        changeType: 'REQUEST_RELEASE',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(releaseLogs.length).toBe(logsBeforeCancel + 1);

    const releaseLog = releaseLogs[0];
    expect(releaseLog.quantityBefore).toBe(15);
    expect(releaseLog.quantityAfter).toBe(15);
    expect(releaseLog.lockedQtyBefore).toBe(4);
    expect(releaseLog.lockedQtyAfter).toBe(0);
    expect(releaseLog.availableQtyBefore).toBe(11);
    expect(releaseLog.availableQtyAfter).toBe(15);
    expect(releaseLog.relatedTicketId).toBe(logTicket.id);
    expect(releaseLog.relatedRequestId).toBe(requestId);
    expect(releaseLog.operatorId).toBe(adminId);
    expect(releaseLog.remark).toContain(logTicket.ticketNo);
    expect(releaseLog.remark).toContain('取消');

    const finalInv = await prisma.inventory.findUnique({
      where: { sparePartId_storeId: { sparePartId: logSparePart.id, storeId: testStoreId } },
    });
    expect(finalInv!.lockedQty).toBe(0);
    expect(finalInv!.availableQty).toBe(15);
    expect(finalInv!.quantity).toBe(15);
  });
});

describe('SLA Escalation', () => {
  it('should escalate overdue tickets via check-sla-escalation endpoint', async () => {
    const ticket = await prisma.repairTicket.create({
      data: {
        ticketNo: `WO-SLA-${Date.now()}`,
        equipmentId: testEquipment3Id,
        storeId: testStoreId,
        faultType: '漏水',
        description: '测试SLA升级',
        imageUrls: '[]',
        urgency: UrgencyLevel.LOW,
        status: TicketStatus.CREATED,
        createdById: storeId,
        slaDeadline: new Date(Date.now() - 60000),
      },
    });
    const ticketId = ticket.id;

    await prisma.statusHistory.create({
      data: {
        ticketId,
        toStatus: TicketStatus.CREATED,
        operatorId: storeId,
        remark: '创建工单',
      },
    });

    const escalationRes = await request(app)
      .post('/api/tickets/check-sla-escalation')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(escalationRes.status).toBe(200);

    const updatedTicket = await prisma.repairTicket.findUnique({ where: { id: ticketId } });
    expect(updatedTicket!.status).toBe('ESCALATED');
    expect(updatedTicket!.escalated).toBe(true);
  });
});

describe('Spare Part Request Auto-Select', () => {
  it('should auto-select store inventory and fall back to backorder', async () => {
    await prisma.technicianProfile.update({
      where: { userId: techId },
      data: { currentLoad: 0 },
    });
    const hqStore = await prisma.store.upsert({
      where: { storeCode: 'HQ001' },
      update: {},
      create: {
        storeCode: 'HQ001',
        name: '总部门店',
        address: '总部地址',
        region: 'HQ',
      },
    });

    const autoPart = await prisma.sparePart.upsert({
      where: { partCode: 'TEST-SP-AUTO' },
      update: {},
      create: {
        partCode: 'TEST-SP-AUTO',
        name: '自动选择备件',
        category: '测试',
        unit: '个',
      },
    });

    await prisma.inventory.upsert({
      where: { sparePartId_storeId: { sparePartId: autoPart.id, storeId: hqStore.id } },
      update: { quantity: 5, lockedQty: 0, availableQty: 5, minStock: 1 },
      create: {
        sparePartId: autoPart.id,
        storeId: hqStore.id,
        quantity: 5,
        lockedQty: 0,
        availableQty: 5,
        minStock: 1,
      },
    });

    await prisma.inventory.upsert({
      where: { sparePartId_storeId: { sparePartId: autoPart.id, storeId: testStoreId } },
      update: { quantity: 5, lockedQty: 0, availableQty: 5, minStock: 1 },
      create: {
        sparePartId: autoPart.id,
        storeId: testStoreId,
        quantity: 5,
        lockedQty: 0,
        availableQty: 5,
        minStock: 1,
      },
    });

    const ticket = await prisma.repairTicket.create({
      data: {
        ticketNo: `WO-AUTO-${Date.now()}`,
        equipmentId: testEquipment2Id,
        storeId: testStoreId,
        faultType: '电路故障',
        description: '测试自动选择库存',
        imageUrls: '[]',
        urgency: UrgencyLevel.MEDIUM,
        status: TicketStatus.CREATED,
        createdById: storeId,
      },
    });
    const ticketId = ticket.id;

    await prisma.statusHistory.create({
      data: {
        ticketId,
        toStatus: TicketStatus.CREATED,
        operatorId: storeId,
        remark: '创建工单',
      },
    });

    await request(app)
      .post(`/api/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ technicianId: techId });

    await request(app)
      .post(`/api/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ status: 'TECHNICIAN_ON_WAY' });

    await request(app)
      .post(`/api/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ status: 'DIAGNOSING' });

    const reqRes = await request(app)
      .post('/api/inventories/requests')
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        ticketId,
        sparePartId: autoPart.id,
        requestQty: 3,
      });

    expect(reqRes.status).toBe(201);
    expect(reqRes.body.data.fromStoreId).toBe(testStoreId);

    const storeInv = await prisma.inventory.findFirst({
      where: { sparePartId: autoPart.id, storeId: testStoreId },
    });
    expect(storeInv!.lockedQty).toBe(3);
    expect(storeInv!.availableQty).toBe(2);

    const req2Res = await request(app)
      .post('/api/inventories/requests')
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        ticketId,
        sparePartId: autoPart.id,
        requestQty: 20,
      });

    expect(req2Res.status).toBe(201);
    expect(req2Res.body.data.status).toBe('BACKORDER');
  });
});

describe('Inventory Log & Low Stock Alert', () => {
  let logTestPartId: number;
  let logTestInvId: number;

  beforeAll(async () => {
    await prisma.technicianProfile.update({
      where: { userId: techId },
      data: { currentLoad: 0 },
    });

    const part = await prisma.sparePart.upsert({
      where: { partCode: 'LOG-TEST-SP' },
      update: {},
      create: {
        partCode: 'LOG-TEST-SP',
        name: '流水测试备件',
        category: '测试',
        unit: '个',
      },
    });
    logTestPartId = part.id;

    const inv = await prisma.inventory.upsert({
      where: { sparePartId_storeId: { sparePartId: part.id, storeId: testStoreId } },
      update: { quantity: 10, lockedQty: 0, availableQty: 10, minStock: 3 },
      create: {
        sparePartId: part.id,
        storeId: testStoreId,
        quantity: 10,
        lockedQty: 0,
        availableQty: 10,
        minStock: 3,
      },
    });
    logTestInvId = inv.id;
  });

  it('should record inventory log when spare part request locks inventory', async () => {
    const ticket = await prisma.repairTicket.create({
      data: {
        ticketNo: `WO-LOG-${Date.now()}`,
        equipmentId: testEquipmentId,
        storeId: testStoreId,
        faultType: '空调维修',
        description: '测试库存流水',
        imageUrls: '[]',
        urgency: UrgencyLevel.MEDIUM,
        status: TicketStatus.DIAGNOSING,
        createdById: storeId,
        assignedToId: techId,
      },
    });

    await prisma.statusHistory.createMany({
      data: [
        { ticketId: ticket.id, toStatus: TicketStatus.CREATED, operatorId: storeId },
        { ticketId: ticket.id, fromStatus: TicketStatus.CREATED, toStatus: TicketStatus.ASSIGNED, operatorId: adminId },
        { ticketId: ticket.id, fromStatus: TicketStatus.ASSIGNED, toStatus: TicketStatus.DIAGNOSING, operatorId: techId },
      ],
    });

    const reqRes = await request(app)
      .post('/api/inventories/requests')
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        ticketId: ticket.id,
        sparePartId: logTestPartId,
        requestQty: 3,
        fromStoreId: testStoreId,
      });

    expect(reqRes.status).toBe(201);

    const logs = await prisma.inventoryLog.findMany({
      where: { sparePartId: logTestPartId, storeId: testStoreId, changeType: 'REQUEST_LOCK' },
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const log = logs[logs.length - 1];
    expect(log.quantityBefore).toBe(10);
    expect(log.quantityAfter).toBe(10);
    expect(log.lockedQtyBefore).toBe(0);
    expect(log.lockedQtyAfter).toBe(3);
    expect(log.availableQtyBefore).toBe(10);
    expect(log.availableQtyAfter).toBe(7);
    expect(log.relatedRequestId).toBe(reqRes.body.data.id);
  });

  it('should record inventory log when spare part request is cancelled (release)', async () => {
    const existingInv = await prisma.inventory.findUnique({ where: { id: logTestInvId } });
    const lockedBefore = existingInv!.lockedQty;

    const ticket = await prisma.repairTicket.create({
      data: {
        ticketNo: `WO-LOG-CANCEL-${Date.now()}`,
        equipmentId: testEquipment2Id,
        storeId: testStoreId,
        faultType: '漏水',
        description: '测试取消流水',
        imageUrls: '[]',
        urgency: UrgencyLevel.MEDIUM,
        status: TicketStatus.DIAGNOSING,
        createdById: storeId,
        assignedToId: techId,
      },
    });

    await prisma.statusHistory.createMany({
      data: [
        { ticketId: ticket.id, toStatus: TicketStatus.CREATED, operatorId: storeId },
        { ticketId: ticket.id, fromStatus: TicketStatus.CREATED, toStatus: TicketStatus.ASSIGNED, operatorId: adminId },
        { ticketId: ticket.id, fromStatus: TicketStatus.ASSIGNED, toStatus: TicketStatus.DIAGNOSING, operatorId: techId },
      ],
    });

    const reqRes = await request(app)
      .post('/api/inventories/requests')
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        ticketId: ticket.id,
        sparePartId: logTestPartId,
        requestQty: 2,
        fromStoreId: testStoreId,
      });
    expect(reqRes.status).toBe(201);

    const cancelRes = await request(app)
      .post(`/api/inventories/requests/${reqRes.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ remark: '测试取消' });
    expect(cancelRes.status).toBe(200);

    const logs = await prisma.inventoryLog.findMany({
      where: { sparePartId: logTestPartId, storeId: testStoreId, changeType: 'REQUEST_RELEASE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const log = logs[0];
    expect(log.lockedQtyAfter).toBe(lockedBefore);
    expect(log.availableQtyAfter).toBeGreaterThan(log.availableQtyBefore);
  });

  it('should record inventory log when admin adjusts inventory', async () => {
    const invBefore = await prisma.inventory.findUnique({ where: { id: logTestInvId } });

    const res = await request(app)
      .put(`/api/inventories/${logTestInvId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 15, minStock: 3 });

    expect(res.status).toBe(200);

    const logs = await prisma.inventoryLog.findMany({
      where: { sparePartId: logTestPartId, storeId: testStoreId, changeType: 'ADMIN_ADJUST' },
      orderBy: { createdAt: 'desc' },
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const log = logs[0];
    expect(log.quantityBefore).toBe(invBefore!.quantity);
    expect(log.quantityAfter).toBe(15);
    expect(log.availableQtyBefore).toBe(invBefore!.availableQty);
  });

  it('should return inventory logs via API with filters', async () => {
    const res = await request(app)
      .get('/api/inventories/logs')
      .query({ sparePartId: logTestPartId, changeType: 'REQUEST_LOCK', pageSize: 10 })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.data[0].changeType).toBe('REQUEST_LOCK');
  });

  it('should return inventory logs with pagination', async () => {
    const res = await request(app)
      .get('/api/inventories/logs')
      .query({ sparePartId: logTestPartId, page: 1, pageSize: 5 })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBeGreaterThan(0);
  });

  it('should return low stock alerts', async () => {
    const lowPart = await prisma.sparePart.upsert({
      where: { partCode: 'LOW-STOCK-SP' },
      update: {},
      create: {
        partCode: 'LOW-STOCK-SP',
        name: '低库存备件',
        category: '测试',
        unit: '个',
      },
    });

    await prisma.inventory.upsert({
      where: { sparePartId_storeId: { sparePartId: lowPart.id, storeId: testStoreId } },
      update: { quantity: 1, lockedQty: 0, availableQty: 1, minStock: 5 },
      create: {
        sparePartId: lowPart.id,
        storeId: testStoreId,
        quantity: 1,
        lockedQty: 0,
        availableQty: 1,
        minStock: 5,
      },
    });

    const res = await request(app)
      .get('/api/inventories/low-stock-alerts')
      .query({ pageSize: 50 })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);

    const lowItem = res.body.data.data.find((i: any) => i.sparePartId === lowPart.id);
    expect(lowItem).toBeDefined();
    expect(lowItem.availableQty).toBeLessThanOrEqual(lowItem.minStock);
  });

  it('should restrict store manager to their own store in logs and alerts', async () => {
    const logsRes = await request(app)
      .get('/api/inventories/logs')
      .set('Authorization', `Bearer ${storeToken}`);

    expect(logsRes.status).toBe(200);
    expect(logsRes.body.success).toBe(true);
    if (logsRes.body.data.data.length > 0) {
      logsRes.body.data.data.forEach((log: any) => {
        expect(log.storeId).toBe(testStoreId);
      });
    }

    const alertsRes = await request(app)
      .get('/api/inventories/low-stock-alerts')
      .set('Authorization', `Bearer ${storeToken}`);

    expect(alertsRes.status).toBe(200);
    expect(alertsRes.body.success).toBe(true);
    if (alertsRes.body.data.data.length > 0) {
      alertsRes.body.data.data.forEach((item: any) => {
        expect(item.storeId).toBe(testStoreId);
      });
    }
  });

  it('should record TRANSFER_OUT log when creating a transfer', async () => {
    const transferPart = await prisma.sparePart.upsert({
      where: { partCode: 'TRF-LOG-SP' },
      update: {},
      create: {
        partCode: 'TRF-LOG-SP',
        name: '调拨流水备件',
        category: '测试',
        unit: '个',
      },
    });

    const destStore = await prisma.store.upsert({
      where: { storeCode: 'DEST-STORE' },
      update: {},
      create: {
        storeCode: 'DEST-STORE',
        name: '调拨目标门店',
        address: '目标地址',
        region: '华东',
      },
    });

    await prisma.inventory.upsert({
      where: { sparePartId_storeId: { sparePartId: transferPart.id, storeId: testStoreId } },
      update: { quantity: 20, lockedQty: 0, availableQty: 20, minStock: 2 },
      create: {
        sparePartId: transferPart.id,
        storeId: testStoreId,
        quantity: 20,
        lockedQty: 0,
        availableQty: 20,
        minStock: 2,
      },
    });

    const ticket = await prisma.repairTicket.create({
      data: {
        ticketNo: `WO-TRF-LOG-${Date.now()}`,
        equipmentId: testEquipmentId,
        storeId: destStore.id,
        faultType: '空调维修',
        description: '测试调拨流水',
        imageUrls: '[]',
        urgency: UrgencyLevel.MEDIUM,
        status: TicketStatus.WAITING_SPARE_PARTS,
        createdById: storeId,
        assignedToId: techId,
      },
    });

    const spr = await prisma.sparePartRequest.create({
      data: {
        requestNo: `SPR-TRF-${Date.now()}`,
        ticketId: ticket.id,
        sparePartId: transferPart.id,
        requestQty: 5,
        fromStoreId: testStoreId,
        toStoreId: destStore.id,
        requestedById: techId,
        status: 'PENDING',
      },
    });

    const trfRes = await request(app)
      .post('/api/inventories/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        requestId: spr.id,
        sparePartId: transferPart.id,
        fromStoreId: testStoreId,
        toStoreId: destStore.id,
        quantity: 5,
      });

    expect(trfRes.status).toBe(201);

    const logs = await prisma.inventoryLog.findMany({
      where: { sparePartId: transferPart.id, storeId: testStoreId, changeType: 'TRANSFER_OUT' },
      orderBy: { createdAt: 'desc' },
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const log = logs[0];
    expect(log.quantityBefore).toBe(20);
    expect(log.quantityAfter).toBe(15);
    expect(log.availableQtyBefore).toBe(20);
    expect(log.availableQtyAfter).toBe(15);
    expect(log.relatedTransferId).toBe(trfRes.body.data.id);
    expect(log.relatedRequestId).toBe(spr.id);
  });

  it('should record TRANSFER_IN log when receiving a transfer', async () => {
    const transferPart = await prisma.sparePart.findUnique({ where: { partCode: 'TRF-LOG-SP' } });
    const destStore = await prisma.store.findUnique({ where: { storeCode: 'DEST-STORE' } });

    const pendingTransfer = await prisma.transfer.findFirst({
      where: { sparePartId: transferPart!.id, fromStoreId: testStoreId, toStoreId: destStore!.id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    expect(pendingTransfer).not.toBeNull();

    await request(app)
      .put(`/api/inventories/transfers/${pendingTransfer!.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_TRANSIT' });

    const invBefore = await prisma.inventory.findUnique({
      where: { sparePartId_storeId: { sparePartId: transferPart!.id, storeId: destStore!.id } },
    });

    const receiveRes = await request(app)
      .post(`/api/inventories/transfers/${pendingTransfer!.id}/receive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ remark: '收到调拨' });

    expect(receiveRes.status).toBe(200);

    const logs = await prisma.inventoryLog.findMany({
      where: { sparePartId: transferPart!.id, storeId: destStore!.id, changeType: 'TRANSFER_IN' },
      orderBy: { createdAt: 'desc' },
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const log = logs[0];
    expect(log.quantityBefore).toBe(invBefore ? invBefore.quantity : 0);
    expect(log.quantityAfter).toBe((invBefore ? invBefore.quantity : 0) + 5);
    expect(log.relatedTransferId).toBe(pendingTransfer!.id);
  });

  it('should record TRANSFER_CANCEL_RETURN log when cancelling a transfer', async () => {
    const cancelPart = await prisma.sparePart.upsert({
      where: { partCode: 'CANCEL-TRF-SP' },
      update: {},
      create: {
        partCode: 'CANCEL-TRF-SP',
        name: '取消调拨备件',
        category: '测试',
        unit: '个',
      },
    });

    const destStore = await prisma.store.findUnique({ where: { storeCode: 'DEST-STORE' } });

    await prisma.inventory.upsert({
      where: { sparePartId_storeId: { sparePartId: cancelPart.id, storeId: testStoreId } },
      update: { quantity: 10, lockedQty: 0, availableQty: 10, minStock: 2 },
      create: {
        sparePartId: cancelPart.id,
        storeId: testStoreId,
        quantity: 10,
        lockedQty: 0,
        availableQty: 10,
        minStock: 2,
      },
    });

    const ticket = await prisma.repairTicket.create({
      data: {
        ticketNo: `WO-CANCEL-TRF-${Date.now()}`,
        equipmentId: testEquipmentId,
        storeId: destStore!.id,
        faultType: '电路故障',
        description: '测试取消调拨流水',
        imageUrls: '[]',
        urgency: UrgencyLevel.MEDIUM,
        status: TicketStatus.WAITING_SPARE_PARTS,
        createdById: storeId,
        assignedToId: techId,
      },
    });

    const spr = await prisma.sparePartRequest.create({
      data: {
        requestNo: `SPR-CANCEL-TRF-${Date.now()}`,
        ticketId: ticket.id,
        sparePartId: cancelPart.id,
        requestQty: 3,
        fromStoreId: testStoreId,
        toStoreId: destStore!.id,
        requestedById: techId,
        status: 'PENDING',
      },
    });

    const trfRes = await request(app)
      .post('/api/inventories/transfers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        requestId: spr.id,
        sparePartId: cancelPart.id,
        fromStoreId: testStoreId,
        toStoreId: destStore!.id,
        quantity: 3,
      });
    expect(trfRes.status).toBe(201);

    const invBeforeCancel = await prisma.inventory.findUnique({
      where: { sparePartId_storeId: { sparePartId: cancelPart.id, storeId: testStoreId } },
    });

    const cancelRes = await request(app)
      .put(`/api/inventories/transfers/${trfRes.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CANCELLED' });
    expect(cancelRes.status).toBe(200);

    const logs = await prisma.inventoryLog.findMany({
      where: { sparePartId: cancelPart.id, storeId: testStoreId, changeType: 'TRANSFER_CANCEL_RETURN' },
      orderBy: { createdAt: 'desc' },
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const log = logs[0];
    expect(log.quantityBefore).toBe(invBeforeCancel!.quantity);
    expect(log.quantityAfter).toBe(invBeforeCancel!.quantity + 3);
    expect(log.availableQtyBefore).toBe(invBeforeCancel!.availableQty);
    expect(log.availableQtyAfter).toBe(invBeforeCancel!.availableQty + 3);
    expect(log.relatedTransferId).toBe(trfRes.body.data.id);
  });

  it('should filter inventory logs by date range', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000).toISOString();
    const tomorrow = new Date(now.getTime() + 86400000).toISOString();

    const res = await request(app)
      .get('/api/inventories/logs')
      .query({ startDate: yesterday, endDate: tomorrow, pageSize: 10 })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
  });
});
