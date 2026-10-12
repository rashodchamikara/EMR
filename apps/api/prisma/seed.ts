import 'dotenv/config';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import {
  PrismaClient,
  RoleScope,
  UserStatus,
} from '../src/generated/prisma/client';

import { hashPassword } from '../src/common/security/password-hashing';

/**
 * Prisma seed uses its own database adapter.
 *
 * Keep this configuration aligned with PrismaService.
 * allowPublicKeyRetrieval is required for our local
 * MySQL 8 Docker setup using caching_sha2_password.
 */
const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  connectionLimit: 5,

  connectTimeout: 5_000,
  acquireTimeout: 10_000,
  idleTimeout: 300,

  allowPublicKeyRetrieval: true,
});

const prisma = new PrismaClient({
  adapter,
});

/**
 * Application permissions.
 *
 * Permission codes are deliberately kept as strings because
 * they are stored in the database and used by
 * @RequirePermissions().
 */
const permissions = [
  // ---------------------------------------------------------
  // Organizations
  // ---------------------------------------------------------
  {
    code: 'organizations.read',
    name: 'View organizations',
    description:
      'View organizations available to the authenticated user.',
  },
  {
    code: 'organizations.create',
    name: 'Create organizations',
    description:
      'Create organizations within the EMR platform.',
  },
  {
    code: 'organizations.update',
    name: 'Update organizations',
    description:
      'Update organization configuration and information.',
  },

  // ---------------------------------------------------------
  // Users
  // ---------------------------------------------------------
  {
    code: 'users.read',
    name: 'View users',
    description:
      'View users within the EMR platform.',
  },
  {
    code: 'users.create',
    name: 'Create users',
    description:
      'Create users within the EMR platform.',
  },
  {
    code: 'users.update',
    name: 'Update users',
    description:
      'Update users within the EMR platform.',
  },

  // ---------------------------------------------------------
  // Roles
  // ---------------------------------------------------------
  {
    code: 'roles.read',
    name: 'View roles',
    description:
      'View roles and role information.',
  },
  {
    code: 'roles.assign',
    name: 'Assign roles',
    description:
      'Assign roles to organization members.',
  },

  // ---------------------------------------------------------
  // Sessions
  // ---------------------------------------------------------
  {
    code: 'sessions.read',
    name: 'View login sessions',
    description:
      'View active and historical login sessions.',
  },
  {
    code: 'sessions.revoke',
    name: 'Revoke login sessions',
    description:
      'Revoke active login sessions.',
  },

  // ---------------------------------------------------------
  // Facilities
  // ---------------------------------------------------------
  {
    code: 'facilities.read',
    name: 'View facilities',
    description:
      'View facilities within the active organization.',
  },
  {
    code: 'facilities.create',
    name: 'Create facilities',
    description:
      'Create facilities within the active organization.',
  },
  {
    code: 'facilities.update',
    name: 'Update facilities',
    description:
      'Update facilities within the active organization.',
  },

  // ---------------------------------------------------------
  // Departments
  // ---------------------------------------------------------
  {
    code: 'departments.read',
    name: 'View departments',
    description:
      'View departments within the active organization.',
  },
  {
    code: 'departments.create',
    name: 'Create departments',
    description:
      'Create departments within an organization facility.',
  },
  {
    code: 'departments.update',
    name: 'Update departments',
    description:
      'Update departments within an organization facility.',
  },

  // ---------------------------------------------------------
  // Rooms
  // ---------------------------------------------------------
  {
    code: 'rooms.read',
    name: 'View rooms',
    description:
      'View rooms within the active organization.',
  },
  {
    code: 'rooms.create',
    name: 'Create rooms',
    description:
      'Create rooms within an organization facility.',
  },
  {
    code: 'rooms.update',
    name: 'Update rooms',
    description:
      'Update rooms within an organization facility.',
  },

  // ---------------------------------------------------------
  // Staff
  // ---------------------------------------------------------
  {
    code: 'staff.read',
    name: 'View organization staff',
    description:
      'View staff members and facility assignments.',
  },
  {
    code: 'staff.create',
    name: 'Create staff',
    description:
      'Create staff records within the active organization.',
  },
  {
    code: 'staff.assign',
    name: 'Assign staff to facilities',
    description:
      'Assign organization staff members to facilities.',
  },
  {
    code: 'staff.update',
    name: 'Update staff assignments',
    description:
      'Update staff and facility assignment information.',
  },

  // ---------------------------------------------------------
  // Practitioners
  // ---------------------------------------------------------
  {
    code: 'practitioners.read',
    name: 'View practitioners',
    description:
      'View practitioner profiles within the active organization.',
  },
  {
    code: 'practitioners.create',
    name: 'Create practitioners',
    description:
      'Create practitioner profiles within the active organization.',
  },
  {
    code: 'practitioners.update',
    name: 'Update practitioners',
    description:
      'Update practitioner profiles within the active organization.',
  },

  // ---------------------------------------------------------
  // Patients — Sprint 6
  // ---------------------------------------------------------
  {
    code: 'patients.read',
    name: 'View patients',
    description:
      'View patient registry records within the active organization.',
  },
  {
    code: 'patients.create',
    name: 'Create patients',
    description:
      'Register new patients within the active organization.',
  },
  {
    code: 'patients.update',
    name: 'Update patients',
    description:
      'Update patient registry records within the active organization.',
  },
];

/**
 * Built-in EMR roles.
 */
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
  {
    code: 'RECEPTIONIST',
    name: 'Receptionist',
    scope: RoleScope.ORGANIZATION,
  },
  {
    code: 'NURSE',
    name: 'Nurse',
    scope: RoleScope.ORGANIZATION,
  },
  {
    code: 'DOCTOR',
    name: 'Doctor',
    scope: RoleScope.ORGANIZATION,
  },
  {
    code: 'LAB_STAFF',
    name: 'Laboratory Staff',
    scope: RoleScope.ORGANIZATION,
  },
  {
    code: 'PHARMACIST',
    name: 'Pharmacist',
    scope: RoleScope.ORGANIZATION,
  },
  {
    code: 'BILLING_OFFICER',
    name: 'Billing Officer',
    scope: RoleScope.ORGANIZATION,
  },
];

/**
 * Create or update all application permissions.
 *
 * Important:
 * We update description as well as name.
 * Your previous implementation updated only the name,
 * meaning descriptions added later were not persisted.
 */
async function seedPermissions(): Promise<void> {
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: {
        code: permission.code,
      },

      update: {
        name: permission.name,
        description: permission.description,
      },

      create: permission,
    });
  }
}

/**
 * Create or update built-in roles.
 */
async function seedRoles(): Promise<void> {
  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        code: role.code,
      },

      update: {
        name: role.name,
        scope: role.scope,
      },

      create: {
        ...role,
        isSystem: true,
      },
    });
  }
}

/**
 * SYSTEM_ADMIN receives every permission that currently
 * exists in the permissions table.
 *
 * This means newly added Patient permissions are
 * automatically assigned to SYSTEM_ADMIN.
 */
async function assignSystemAdminPermissions(): Promise<void> {
  const systemAdminRole =
    await prisma.role.findUniqueOrThrow({
      where: {
        code: 'SYSTEM_ADMIN',
      },
    });

  const allPermissions =
    await prisma.permission.findMany();

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: systemAdminRole.id,
          permissionId: permission.id,
        },
      },

      update: {},

      create: {
        roleId: systemAdminRole.id,
        permissionId: permission.id,
      },
    });
  }
}

/**
 * ORG_ADMIN receives administrative permissions for
 * resources belonging to an organization.
 */
async function assignOrganizationAdminPermissions(): Promise<void> {
  const organizationAdminRole =
    await prisma.role.findUniqueOrThrow({
      where: {
        code: 'ORG_ADMIN',
      },
    });

  const permissionCodes = [
    // Organization
    'organizations.read',
    'organizations.update',

    // Facilities
    'facilities.read',
    'facilities.create',
    'facilities.update',

    // Departments
    'departments.read',
    'departments.create',
    'departments.update',

    // Rooms
    'rooms.read',
    'rooms.create',
    'rooms.update',

    // Staff
    'staff.read',
    'staff.create',
    'staff.assign',
    'staff.update',

    // Roles
    'roles.read',
    'roles.assign',

    // Practitioners
    'practitioners.read',
    'practitioners.create',
    'practitioners.update',

    // Patients — Sprint 6
    'patients.read',
    'patients.create',
    'patients.update',

    // Sessions
    'sessions.read',
    'sessions.revoke',
  ];

  const organizationPermissions =
    await prisma.permission.findMany({
      where: {
        code: {
          in: permissionCodes,
        },
      },
    });

  for (const permission of organizationPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: organizationAdminRole.id,
          permissionId: permission.id,
        },
      },

      update: {},

      create: {
        roleId: organizationAdminRole.id,
        permissionId: permission.id,
      },
    });
  }
}

/**
 * Create the initial SYSTEM_ADMIN account if it
 * does not already exist.
 */
async function seedSystemAdministrator(): Promise<void> {
  const email =
    process.env.SEED_ADMIN_EMAIL
      ?.trim()
      .toLowerCase();

  const password =
    process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required.',
    );
  }

  const existingUser =
    await prisma.user.findUnique({
      where: {
        emailNormalized: email,
      },
    });

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;

    console.log(
      'System administrator already exists. Password was not reset.',
    );
  } else {
    const passwordHash =
      await hashPassword(password);

    const user =
      await prisma.user.create({
        data: {
          email,
          emailNormalized: email,
          passwordHash,

          firstName:
            process.env.SEED_ADMIN_FIRST_NAME ??
            'System',

          lastName:
            process.env.SEED_ADMIN_LAST_NAME ??
            'Administrator',

          status: UserStatus.ACTIVE,
        },
      });

    userId = user.id;
  }

  const systemAdminRole =
    await prisma.role.findUniqueOrThrow({
      where: {
        code: 'SYSTEM_ADMIN',
      },
    });

  await prisma.userSystemRole.upsert({
    where: {
      userId_roleId: {
        userId,
        roleId: systemAdminRole.id,
      },
    },

    update: {},

    create: {
      userId,
      roleId: systemAdminRole.id,
    },
  });
}

/**
 * Main seed execution.
 */
async function main(): Promise<void> {
  console.log('Starting authentication seed...');

  await seedPermissions();

  console.log('Permissions seeded.');

  await seedRoles();

  console.log('Roles seeded.');

  await assignSystemAdminPermissions();

  console.log(
    'System administrator permissions assigned.',
  );

  await assignOrganizationAdminPermissions();

  console.log(
    'Organization administrator permissions assigned.',
  );

  await seedSystemAdministrator();

  console.log(
    'Authentication seed completed.',
  );
}

void main()
  .catch((error: unknown) => {
    console.error('Authentication seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => { await prisma.$disconnect(); });
