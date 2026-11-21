-- CreateTable
CREATE TABLE `interviews` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `applicationId` CHAR(36) NOT NULL,
    `round` INTEGER NOT NULL DEFAULT 1,
    `type` ENUM('PHONE', 'VIDEO', 'ONSITE', 'TECHNICAL', 'BEHAVIORAL', 'HR', 'OTHER') NOT NULL DEFAULT 'VIDEO',
    `scheduledAt` DATETIME(3) NOT NULL,
    `durationMinutes` INTEGER NOT NULL DEFAULT 60,
    `location` VARCHAR(255) NULL,
    `meetingUrl` VARCHAR(2048) NULL,
    `interviewerName` VARCHAR(100) NULL,
    `status` ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `result` ENUM('PENDING', 'PASSED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `feedback` TEXT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `interviews_userId_scheduledAt_idx`(`userId`, `scheduledAt`),
    INDEX `interviews_applicationId_scheduledAt_idx`(`applicationId`, `scheduledAt`),
    INDEX `interviews_userId_status_idx`(`userId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `interviews` ADD CONSTRAINT `interviews_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `interviews` ADD CONSTRAINT `interviews_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `job_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
