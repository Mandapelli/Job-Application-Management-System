-- AlterTable
ALTER TABLE `job_applications` ADD COLUMN `recruiterId` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `recruiters` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NULL,
    `name` VARCHAR(100) NOT NULL,
    `title` VARCHAR(100) NULL,
    `email` VARCHAR(255) NULL,
    `phone` VARCHAR(30) NULL,
    `linkedinUrl` VARCHAR(2048) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `recruiters_userId_name_idx`(`userId`, `name`),
    INDEX `recruiters_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `job_applications_recruiterId_idx` ON `job_applications`(`recruiterId`);

-- AddForeignKey
ALTER TABLE `job_applications` ADD CONSTRAINT `job_applications_recruiterId_fkey` FOREIGN KEY (`recruiterId`) REFERENCES `recruiters`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recruiters` ADD CONSTRAINT `recruiters_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recruiters` ADD CONSTRAINT `recruiters_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
