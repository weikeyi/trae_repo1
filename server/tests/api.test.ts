import request from 'supertest';
import app from '../src/index';
import prisma from '../src/config/prisma';
import { hashPassword, generateToken } from '../src/utils/auth';
import { Role, UrgencyLevel } from '@prisma/client';

let adminToken: string;
let storeToken: string;
let techToken: string;
let adminId: number;
let storeId: number;
let techId: number;
let testStoreId: number;
let testEquipmentId: number;

beforeAll(async () => {
  await prisma.$connect();

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
  adminToken = generateToken({ userId: admin.id, username: admin.username, role: admin.role });

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
  storeToken = generateToken({ userId: store.id, username: store.username, role: store.role, storeId: store.storeId });

  const tech = await prisma.user.upsert({
    where: { username: 'testtech' },
    update: {},
    create: {
      username: 'testtech',
      passwordHash: techPwd,
      realName: '测试维修员',
      role: Role.TECHNICIAN,
      technician: {
        create: {
          skills: ['空调维修'],
          regions: ['测试区域'],
          maxLoad: 5,
        },
      },
    },
  });
  techId = tech.id;
  techToken = generateToken({ userId: tech.id, username: tech.username, role: tech.role });

  const equipment = await prisma.equipment.upsert({
    where: { equipmentCode: 'TEST-EQ-001' },
    update: {},
    create: {
      equipmentCode: 'TEST-EQ-001',
      name: '测试设备',
      category: '测试分类',
      storeId: testStore.id,
    },
  });
  testEquipmentId = equipment.id;

  await prisma.slaRule.deleteMany({});
  await prisma.slaRule.create({
    data: {
      urgency: UrgencyLevel.MEDIUM,
      responseMinutes: 120,
      resolutionMinutes: 1440,
      escalationMinutes: 720,
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
        description: '空调不制冷，需要检修',
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
