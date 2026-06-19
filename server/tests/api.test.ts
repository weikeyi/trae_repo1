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
