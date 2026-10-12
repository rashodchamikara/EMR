-- Patient tables already defined in the supplied schema; no existing tables are altered.

CREATE TABLE `patients` (
    `id` CHAR(36) NOT NULL,
    `organization_id` CHAR(36) NOT NULL,
    `medical_record_number` VARCHAR(40) NOT NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `middle_name` VARCHAR(100) NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `date_of_birth` DATE NULL,
    `sex` ENUM('MALE', 'FEMALE', 'OTHER', 'UNKNOWN') NULL,
    `national_id_type` VARCHAR(30) NULL,
    `national_id_number` VARCHAR(100) NULL,
    `phone` VARCHAR(50) NULL,
    `alternate_phone` VARCHAR(50) NULL,
    `email` VARCHAR(190) NULL,
    `address_line_1` VARCHAR(190) NULL,
    `address_line_2` VARCHAR(190) NULL,
    `city` VARCHAR(100) NULL,
    `state_province` VARCHAR(100) NULL,
    `postal_code` VARCHAR(30) NULL,
    `country` VARCHAR(100) NULL,
    `blood_group` VARCHAR(10) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'DECEASED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `patients_organization_id_medical_record_number_key`(`organization_id`, `medical_record_number`),
    INDEX `patients_organization_id_idx`(`organization_id`),
    INDEX `patients_organization_id_first_name_last_name_idx`(`organization_id`, `first_name`, `last_name`),
    INDEX `patients_organization_id_phone_idx`(`organization_id`, `phone`),
    INDEX `patients_organization_id_email_idx`(`organization_id`, `email`),
    INDEX `patients_organization_id_national_id_number_idx`(`organization_id`, `national_id_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `patient_facilities` (
    `id` CHAR(36) NOT NULL,
    `organization_id` CHAR(36) NOT NULL,
    `patient_id` CHAR(36) NOT NULL,
    `facility_id` CHAR(36) NOT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `registered_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `patient_facilities_patient_id_facility_id_key`(`patient_id`, `facility_id`),
    INDEX `patient_facilities_organization_id_idx`(`organization_id`),
    INDEX `patient_facilities_organization_id_facility_id_idx`(`organization_id`, `facility_id`),
    INDEX `patient_facilities_patient_id_idx`(`patient_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `patient_emergency_contacts` (
    `id` CHAR(36) NOT NULL,
    `organization_id` CHAR(36) NOT NULL,
    `patient_id` CHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `relationship` VARCHAR(100) NULL,
    `phone` VARCHAR(50) NOT NULL,
    `alternate_phone` VARCHAR(50) NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `patient_emergency_contacts_organization_id_idx`(`organization_id`),
    INDEX `patient_emergency_contacts_patient_id_idx`(`patient_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `patient_number_sequences` (
    `organization_id` CHAR(36) NOT NULL,
    `next_value` INTEGER NOT NULL DEFAULT 1,
    `updated_at` DATETIME(3) NOT NULL,
    PRIMARY KEY (`organization_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `patients` ADD CONSTRAINT `patients_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `patient_facilities` ADD CONSTRAINT `patient_facilities_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `patient_facilities` ADD CONSTRAINT `patient_facilities_patient_id_fkey` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `patient_facilities` ADD CONSTRAINT `patient_facilities_facility_id_fkey` FOREIGN KEY (`facility_id`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `patient_emergency_contacts` ADD CONSTRAINT `patient_emergency_contacts_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `patient_emergency_contacts` ADD CONSTRAINT `patient_emergency_contacts_patient_id_fkey` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `patient_number_sequences` ADD CONSTRAINT `patient_number_sequences_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
