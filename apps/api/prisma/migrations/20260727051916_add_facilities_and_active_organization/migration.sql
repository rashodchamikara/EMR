-- AlterTable
ALTER TABLE `user_sessions` ADD COLUMN `activeOrganizationId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `facilities` (
    `id` CHAR(36) NOT NULL,
    `organization_id` CHAR(36) NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `legal_name` VARCHAR(200) NULL,
    `type` ENUM('HOSPITAL', 'CLINIC', 'LABORATORY', 'PHARMACY', 'DIAGNOSTIC_CENTER', 'ADMINISTRATIVE', 'OTHER') NOT NULL DEFAULT 'CLINIC',
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `timezone` VARCHAR(50) NOT NULL DEFAULT 'Asia/Colombo',
    `phone` VARCHAR(30) NULL,
    `email` VARCHAR(254) NULL,
    `address_line_1` VARCHAR(200) NULL,
    `address_line_2` VARCHAR(200) NULL,
    `city` VARCHAR(100) NULL,
    `state_province` VARCHAR(100) NULL,
    `postal_code` VARCHAR(20) NULL,
    `country_code` CHAR(2) NOT NULL DEFAULT 'LK',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `facilities_organization_id_status_idx`(`organization_id`, `status`),
    INDEX `facilities_organization_id_name_idx`(`organization_id`, `name`),
    UNIQUE INDEX `facilities_organization_id_code_key`(`organization_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `user_sessions_activeOrganizationId_idx` ON `user_sessions`(`activeOrganizationId`);

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_activeOrganizationId_fkey` FOREIGN KEY (`activeOrganizationId`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facilities` ADD CONSTRAINT `facilities_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
