import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import {
  PrismaClient,
  RoleScope,
  UserStatus,
} from '../src/generated/prisma/client';
import { hashPassword } from '../src/common/security/password-hashing';
const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });
const permissions = [
  { code: 'organizations.read', name: 'View organizations' },
  { code: 'organizations.create', name: 'Create organizations' },
  { code: 'organizations.update', name: 'Update organizations' },
  { code: 'users.read', name: 'View users' },
  { code: 'users.create', name: 'Create users' },
  { code: 'users.update', name: 'Update users' },
  { code: 'roles.read', name: 'View roles' },
  { code: 'roles.assign', name: 'Assign roles' },
  { code: 'sessions.read', name: 'View login sessions' },
  { code: 'sessions.revoke', name: 'Revoke login sessions' },
];
const roles = [
  {
    code: 'SYSTEM_ADMIN',
    name: 'System Administrator',
    scope: RoleScope.SYSTEM,
  },
  {
    code: 'ORG_ADMIN',
    name: 'Organization Administrator',
    scope: RoleScope.ORGANIZATION,
  },
  { code: 'RECEPTIONIST', name: 'Receptionist', scope: RoleScope.ORGANIZATION },
  { code: 'NURSE', name: 'Nurse', scope: RoleScope.ORGANIZATION },
  { code: 'DOCTOR', name: 'Doctor', scope: RoleScope.ORGANIZATION },
  {
    code: 'LAB_STAFF',
    name: 'Laboratory Staff',
    scope: RoleScope.ORGANIZATION,
  },
  { code: 'PHARMACIST', name: 'Pharmacist', scope: RoleScope.ORGANIZATION },
  {
    code: 'BILLING_OFFICER',
    name: 'Billing Officer',
    scope: RoleScope.ORGANIZATION,
  },
];
async function seedPermissions(): Promise<void> {
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { name: permission.name },
      create: permission,
    });
  }
}
async function seedRoles(): Promise<void> {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, scope: role.scope },
      create: { ...role, isSystem: true },
    });
  }
}
async function assignSystemAdminPermissions(): Promise<void> {
  const systemAdminRole = await prisma.role.findUniqueOrThrow({
    where: { code: 'SYSTEM_ADMIN' },
  });
  const allPermissions = await prisma.permission.findMany();
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: systemAdminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: { roleId: systemAdminRole.id, permissionId: permission.id },
    });
  }
}
async function seedSystemAdministrator(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required.');
  }
  const existingUser = await prisma.user.findUnique({
    where: { emailNormalized: email },
  });
  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
    console.log('System administrator already exists. Password was not reset.');
  } else {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        emailNormalized: email,
        passwordHash,
        firstName: process.env.SEED_ADMIN_FIRST_NAME ?? 'System',
        lastName: process.env.SEED_ADMIN_LAST_NAME ?? 'Administrator',
        status: UserStatus.ACTIVE,
      },
    });
    userId = user.id;
  }
  const systemAdminRole = await prisma.role.findUniqueOrThrow({
    where: { code: 'SYSTEM_ADMIN' },
  });
  await prisma.userSystemRole.upsert({
    where: { userId_roleId: { userId, roleId: systemAdminRole.id } },
    update: {},
    create: { userId, roleId: systemAdminRole.id },
  });
}
async function main(): Promise<void> {
  await seedPermissions();
  await seedRoles();
  await assignSystemAdminPermissions();
  await seedSystemAdministrator();
  console.log('Authentication seed completed.');
}
main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
