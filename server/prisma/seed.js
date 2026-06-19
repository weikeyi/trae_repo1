"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const auth_1 = require("../src/utils/auth");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('开始创建种子数据...');
    const adminPassword = await (0, auth_1.hashPassword)('admin123');
    const storePassword = await (0, auth_1.hashPassword)('store123');
    const techPassword = await (0, auth_1.hashPassword)('tech123');
    const hqStore = await prisma.store.upsert({
        where: { storeCode: 'HQ001' },
        update: {},
        create: {
            storeCode: 'HQ001',
            name: '总部仓库',
            address: '上海市浦东新区总部大楼',
            region: 'HQ',
            phone: '021-88888888',
        },
    });
    const store1 = await prisma.store.upsert({
        where: { storeCode: 'SH001' },
        update: {},
        create: {
            storeCode: 'SH001',
            name: '上海浦东店',
            address: '上海市浦东新区张杨路500号',
            region: '华东',
            phone: '021-66666666',
        },
    });
    const store2 = await prisma.store.upsert({
        where: { storeCode: 'SH002' },
        update: {},
        create: {
            storeCode: 'SH002',
            name: '上海徐汇店',
            address: '上海市徐汇区肇嘉浜路1000号',
            region: '华东',
            phone: '021-77777777',
        },
    });
    const store3 = await prisma.store.upsert({
        where: { storeCode: 'BJ001' },
        update: {},
        create: {
            storeCode: 'BJ001',
            name: '北京朝阳店',
            address: '北京市朝阳区建国门外大街1号',
            region: '华北',
            phone: '010-66666666',
        },
    });
    const store4 = await prisma.store.upsert({
        where: { storeCode: 'GZ001' },
        update: {},
        create: {
            storeCode: 'GZ001',
            name: '广州天河店',
            address: '广州市天河区天河路385号',
            region: '华南',
            phone: '020-66666666',
        },
    });
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            passwordHash: adminPassword,
            realName: '系统管理员',
            phone: '13800000000',
            email: 'admin@example.com',
            role: client_1.Role.ADMIN,
        },
    });
    const storeManager1 = await prisma.user.upsert({
        where: { username: 'store1' },
        update: {},
        create: {
            username: 'store1',
            passwordHash: storePassword,
            realName: '张店长',
            phone: '13800000001',
            email: 'zhang@example.com',
            role: client_1.Role.STORE_MANAGER,
            storeId: store1.id,
        },
    });
    const storeManager2 = await prisma.user.upsert({
        where: { username: 'store2' },
        update: {},
        create: {
            username: 'store2',
            passwordHash: storePassword,
            realName: '李店长',
            phone: '13800000002',
            email: 'li@example.com',
            role: client_1.Role.STORE_MANAGER,
            storeId: store2.id,
        },
    });
    const tech1 = await prisma.user.upsert({
        where: { username: 'tech1' },
        update: {},
        create: {
            username: 'tech1',
            passwordHash: techPassword,
            realName: '王师傅',
            phone: '13900000001',
            email: 'wang@example.com',
            role: client_1.Role.TECHNICIAN,
            technician: {
                create: {
                    skills: ['空调维修', '制冷设备', '电器维修'],
                    regions: ['华东'],
                    maxLoad: 5,
                },
            },
        },
    });
    const tech2 = await prisma.user.upsert({
        where: { username: 'tech2' },
        update: {},
        create: {
            username: 'tech2',
            passwordHash: techPassword,
            realName: '赵师傅',
            phone: '13900000002',
            email: 'zhao@example.com',
            role: client_1.Role.TECHNICIAN,
            technician: {
                create: {
                    skills: ['空调维修', '暖通设备'],
                    regions: ['华东', '华北'],
                    maxLoad: 4,
                },
            },
        },
    });
    const tech3 = await prisma.user.upsert({
        where: { username: 'tech3' },
        update: {},
        create: {
            username: 'tech3',
            passwordHash: techPassword,
            realName: '刘师傅',
            phone: '13900000003',
            email: 'liu@example.com',
            role: client_1.Role.TECHNICIAN,
            technician: {
                create: {
                    skills: ['电气维修', '电路检修'],
                    regions: ['华南'],
                    maxLoad: 6,
                },
            },
        },
    });
    await prisma.equipment.deleteMany({});
    const equipments = [
        { equipmentCode: 'EQ-SH001-001', name: '中央空调机组1号', model: '格力GMV-500', category: '空调设备', storeId: store1.id, status: 'NORMAL', description: '门店主空调机组' },
        { equipmentCode: 'EQ-SH001-002', name: '冷库制冷机组', model: '比泽尔4G-20.2', category: '制冷设备', storeId: store1.id, status: 'NORMAL', description: '生鲜区冷库' },
        { equipmentCode: 'EQ-SH001-003', name: '电梯A', model: '三菱LEHY-III', category: '电梯设备', storeId: store1.id, status: 'NORMAL', description: '客梯A' },
        { equipmentCode: 'EQ-SH002-001', name: '中央空调机组1号', model: '美的MDV-450', category: '空调设备', storeId: store2.id, status: 'NORMAL', description: '门店主空调机组' },
        { equipmentCode: 'EQ-SH002-002', name: '配电柜', model: '正泰GCK-001', category: '电气设备', storeId: store2.id, status: 'FAULT', description: '主配电系统' },
        { equipmentCode: 'EQ-BJ001-001', name: '中央空调', model: '大金VRV-X', category: '空调设备', storeId: store3.id, status: 'NORMAL', description: '中央空调系统' },
        { equipmentCode: 'EQ-GZ001-001', name: '冷藏柜组', model: '海尔SC-650HL', category: '制冷设备', storeId: store4.id, status: 'NORMAL', description: '饮料冷藏柜' },
    ];
    for (const eq of equipments) {
        await prisma.equipment.create({ data: eq });
    }
    await prisma.slaRule.deleteMany({});
    const slaRules = [
        { urgency: client_1.UrgencyLevel.LOW, responseMinutes: 240, resolutionMinutes: 2880, escalationMinutes: 1440, description: '低优先级：4小时响应，48小时解决' },
        { urgency: client_1.UrgencyLevel.MEDIUM, responseMinutes: 120, resolutionMinutes: 1440, escalationMinutes: 720, description: '中优先级：2小时响应，24小时解决' },
        { urgency: client_1.UrgencyLevel.HIGH, responseMinutes: 60, resolutionMinutes: 480, escalationMinutes: 240, description: '高优先级：1小时响应，8小时解决' },
        { urgency: client_1.UrgencyLevel.URGENT, responseMinutes: 30, resolutionMinutes: 240, escalationMinutes: 120, description: '紧急：30分钟响应，4小时解决' },
    ];
    for (const sla of slaRules) {
        await prisma.slaRule.create({ data: sla });
    }
    await prisma.sparePart.deleteMany({});
    const spareParts = [
        { partCode: 'SP-AC-001', name: '空调压缩机', category: '空调配件', unit: '台', description: '格力/美的通用压缩机' },
        { partCode: 'SP-AC-002', name: '空调风机电机', category: '空调配件', unit: '台', description: '室外风机电机' },
        { partCode: 'SP-AC-003', name: '空调控制板', category: '空调配件', unit: '块', description: '主控电路板' },
        { partCode: 'SP-RF-001', name: '制冷压缩机', category: '制冷配件', unit: '台', description: '比泽尔制冷压缩机' },
        { partCode: 'SP-RF-002', name: '膨胀阀', category: '制冷配件', unit: '个', description: '热力膨胀阀' },
        { partCode: 'SP-EL-001', name: '空气开关100A', category: '电气配件', unit: '个', description: '断路器' },
        { partCode: 'SP-EL-002', name: '接触器', category: '电气配件', unit: '个', description: '交流接触器' },
        { partCode: 'SP-EL-003', name: '变频器', category: '电气配件', unit: '台', description: '通用变频器' },
        { partCode: 'SP-ME-001', name: '电梯门机', category: '电梯配件', unit: '台', description: '电梯开门机' },
    ];
    const createdParts = [];
    for (const sp of spareParts) {
        const p = await prisma.sparePart.create({ data: sp });
        createdParts.push(p);
    }
    await prisma.inventory.deleteMany({});
    const inventoryData = [
        { storeId: hqStore.id, stock: { 'SP-AC-001': 10, 'SP-AC-002': 15, 'SP-AC-003': 20, 'SP-RF-001': 5, 'SP-RF-002': 12, 'SP-EL-001': 30, 'SP-EL-002': 25, 'SP-EL-003': 8, 'SP-ME-001': 3 } },
        { storeId: store1.id, stock: { 'SP-AC-001': 2, 'SP-AC-002': 3, 'SP-EL-001': 5, 'SP-EL-002': 4 } },
        { storeId: store2.id, stock: { 'SP-AC-001': 1, 'SP-EL-001': 6, 'SP-EL-002': 3 } },
        { storeId: store3.id, stock: { 'SP-AC-002': 2, 'SP-AC-003': 3 } },
        { storeId: store4.id, stock: { 'SP-RF-001': 1, 'SP-RF-002': 2, 'SP-EL-001': 4 } },
    ];
    for (const inv of inventoryData) {
        for (const [code, qty] of Object.entries(inv.stock)) {
            const part = createdParts.find((p) => p.partCode === code);
            if (part) {
                await prisma.inventory.create({
                    data: {
                        sparePartId: part.id,
                        storeId: inv.storeId,
                        quantity: qty,
                        availableQty: qty,
                        minStock: Math.ceil(qty / 3),
                    },
                });
            }
        }
    }
    console.log('种子数据创建完成！');
    console.log('');
    console.log('默认账号：');
    console.log('  管理员: admin / admin123');
    console.log('  门店(浦东店): store1 / store123');
    console.log('  门店(徐汇店): store2 / store123');
    console.log('  维修员(华东-王): tech1 / tech123');
    console.log('  维修员(华东-赵): tech2 / tech123');
    console.log('  维修员(华南-刘): tech3 / tech123');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map