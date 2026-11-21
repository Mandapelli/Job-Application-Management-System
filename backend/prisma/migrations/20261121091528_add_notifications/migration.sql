-- CreateTable
CREATE TABLE `notifications` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `type` ENUM('INTERVIEW_REMINDER', 'TASK_DUE', 'TASK_OVERDUE') NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `link` VARCHAR(255) NULL,
    `eventAt` DATETIME(3) NULL,
    `dedupeKey` VARCHAR(255) NOT NULL,
    `interviewId` CHAR(36) NULL,
    `taskId` CHAR(36) NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_userId_readAt_createdAt_idx`(`userId`, `readAt`, `createdAt`),
    INDEX `notifications_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `notifications_interviewId_idx`(`interviewId`),
    INDEX `notifications_taskId_idx`(`taskId`),
    UNIQUE INDEX `notifications_userId_dedupeKey_key`(`userId`, `dedupeKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `interviews_status_scheduledAt_idx` ON `interviews`(`status`, `scheduledAt`);

-- CreateIndex
CREATE INDEX `tasks_status_dueAt_idx` ON `tasks`(`status`, `dueAt`);

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_interviewId_fkey` FOREIGN KEY (`interviewId`) REFERENCES `interviews`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
