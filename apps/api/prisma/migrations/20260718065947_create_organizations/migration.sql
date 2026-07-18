-- CreateTable
CREATE TABLE `organizations` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `legal_name` VARCHAR(200) NULL,
    `type` ENUM('CLINIC', 'HOSPITAL', 'LABORATORY', 'PHARMACY', 'DIAGNOSTIC_CENTER', 'OTHER') NOT NULL DEFAULT 'CLINIC',
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `timezone` VARCHAR(50) NOT NULL DEFAULT 'Asia/Colombo',
    `locale` VARCHAR(20) NOT NULL DEFAULT 'en-LK',
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

    UNIQUE INDEX `organizations_code_key`(`code`),
    INDEX `organizations_name_idx`(`name`),
    INDEX `organizations_status_idx`(`status`),
    INDEX `organizations_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
