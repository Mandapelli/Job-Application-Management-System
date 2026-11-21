-- CreateTable
CREATE TABLE `tasks` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `applicationId` CHAR(36) NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `dueAt` DATETIME(3) NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('PENDING', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tasks_userId_status_dueAt_idx`(`userId`, `status`, `dueAt`),
    INDEX `tasks_applicationId_idx`(`applicationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `job_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
