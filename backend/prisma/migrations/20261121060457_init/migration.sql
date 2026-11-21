-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `companies` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `website` VARCHAR(2048) NULL,
    `industry` VARCHAR(100) NULL,
    `location` VARCHAR(150) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `companies_userId_name_key`(`userId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_applications` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NULL,
    `companyName` VARCHAR(150) NOT NULL,
    `jobTitle` VARCHAR(150) NOT NULL,
    `jobDescription` TEXT NULL,
    `jobUrl` VARCHAR(2048) NULL,
    `location` VARCHAR(150) NULL,
    `employmentType` ENUM('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP') NULL,
    `workMode` ENUM('REMOTE', 'HYBRID', 'ONSITE') NULL,
    `salaryMin` INTEGER NULL,
    `salaryMax` INTEGER NULL,
    `salaryCurrency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `appliedDate` DATE NULL,
    `status` ENUM('WISHLIST', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN') NOT NULL DEFAULT 'WISHLIST',
    `recruiterName` VARCHAR(100) NULL,
    `recruiterEmail` VARCHAR(255) NULL,
    `recruiterPhone` VARCHAR(30) NULL,
    `resumeId` CHAR(36) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `job_applications_userId_status_idx`(`userId`, `status`),
    INDEX `job_applications_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `job_applications_userId_appliedDate_idx`(`userId`, `appliedDate`),
    INDEX `job_applications_userId_companyName_idx`(`userId`, `companyName`),
    INDEX `job_applications_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `application_status_history` (
    `id` CHAR(36) NOT NULL,
    `applicationId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `fromStatus` ENUM('WISHLIST', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN') NULL,
    `toStatus` ENUM('WISHLIST', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN') NOT NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `application_status_history_applicationId_changedAt_idx`(`applicationId`, `changedAt`),
    INDEX `application_status_history_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `companies` ADD CONSTRAINT `companies_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_applications` ADD CONSTRAINT `job_applications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_applications` ADD CONSTRAINT `job_applications_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_status_history` ADD CONSTRAINT `application_status_history_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `job_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_status_history` ADD CONSTRAINT `application_status_history_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
