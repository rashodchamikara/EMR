-- CreateTable
CREATE TABLE `departments` (
    `id` CHAR(36) NOT NULL,
    `organization_id` CHAR(36) NOT NULL,
    `facility_id` CHAR(36) NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` VARCHAR(500) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `departments_organization_id_status_idx`(`organization_id`, `status`),
    INDEX `departments_facility_id_status_idx`(`facility_id`, `status`),
    INDEX `departments_facility_id_name_idx`(`facility_id`, `name`),
    UNIQUE INDEX `departments_facility_id_code_key`(`facility_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rooms` (
    `id` CHAR(36) NOT NULL,
    `organization_id` CHAR(36) NOT NULL,
    `facility_id` CHAR(36) NOT NULL,
    `department_id` CHAR(36) NULL,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `type` ENUM('CONSULTATION', 'TREATMENT', 'PROCEDURE', 'WARD', 'LABORATORY', 'IMAGING', 'PHARMACY', 'OFFICE', 'STORAGE', 'OTHER') NOT NULL DEFAULT 'CONSULTATION',
    `status` ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE') NOT NULL DEFAULT 'ACTIVE',
    `floor` VARCHAR(50) NULL,
    `capacity` INTEGER NOT NULL DEFAULT 1,
    `notes` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `rooms_organization_id_status_idx`(`organization_id`, `status`),
    INDEX `rooms_facility_id_status_idx`(`facility_id`, `status`),
    INDEX `rooms_department_id_status_idx`(`department_id`, `status`),
    INDEX `rooms_facility_id_name_idx`(`facility_id`, `name`),
    UNIQUE INDEX `rooms_facility_id_code_key`(`facility_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff_facility_assignments` (
    `id` CHAR(36) NOT NULL,
    `organization_id` CHAR(36) NOT NULL,
    `facility_id` CHAR(36) NOT NULL,
    `membership_id` CHAR(36) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ended_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `staff_facility_assignments_organization_id_status_idx`(`organization_id`, `status`),
    INDEX `staff_facility_assignments_membership_id_status_idx`(`membership_id`, `status`),
    INDEX `staff_facility_assignments_facility_id_status_idx`(`facility_id`, `status`),
    UNIQUE INDEX `staff_facility_assignments_facility_id_membership_id_key`(`facility_id`, `membership_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `practitioners` (
    `id` CHAR(36) NOT NULL,
    `organization_id` CHAR(36) NOT NULL,
    `membership_id` CHAR(36) NOT NULL,
    `type` ENUM('PHYSICIAN', 'DENTIST', 'NURSE', 'MIDWIFE', 'PHARMACIST', 'LAB_TECHNOLOGIST', 'RADIOGRAPHER', 'THERAPIST', 'OTHER') NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `title` VARCHAR(30) NULL,
    `registration_number` VARCHAR(100) NULL,
    `registration_authority` VARCHAR(150) NULL,
    `primary_specialty` VARCHAR(150) NULL,
    `consultation_duration_minutes` INTEGER NOT NULL DEFAULT 15,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `practitioners_membership_id_key`(`membership_id`),
    INDEX `practitioners_organization_id_status_idx`(`organization_id`, `status`),
    INDEX `practitioners_organization_id_type_idx`(`organization_id`, `type`),
    INDEX `practitioners_organization_id_primary_specialty_idx`(`organization_id`, `primary_specialty`),
    UNIQUE INDEX `practitioners_organization_id_registration_number_key`(`organization_id`, `registration_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_facility_id_fkey` FOREIGN KEY (`facility_id`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rooms` ADD CONSTRAINT `rooms_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rooms` ADD CONSTRAINT `rooms_facility_id_fkey` FOREIGN KEY (`facility_id`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rooms` ADD CONSTRAINT `rooms_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_facility_assignments` ADD CONSTRAINT `staff_facility_assignments_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_facility_assignments` ADD CONSTRAINT `staff_facility_assignments_facility_id_fkey` FOREIGN KEY (`facility_id`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_facility_assignments` ADD CONSTRAINT `staff_facility_assignments_membership_id_fkey` FOREIGN KEY (`membership_id`) REFERENCES `organization_memberships`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `practitioners` ADD CONSTRAINT `practitioners_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `practitioners` ADD CONSTRAINT `practitioners_membership_id_fkey` FOREIGN KEY (`membership_id`) REFERENCES `organization_memberships`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
