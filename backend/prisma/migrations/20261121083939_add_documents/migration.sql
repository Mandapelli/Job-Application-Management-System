-- CreateTable
CREATE TABLE `documents` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `storageKey` VARCHAR(255) NOT NULL,
    `type` ENUM('RESUME', 'COVER_LETTER', 'OTHER') NOT NULL DEFAULT 'RESUME',
    `description` VARCHAR(1000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `documents_storageKey_key`(`storageKey`),
    INDEX `documents_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `documents_userId_type_idx`(`userId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `application_documents` (
    `applicationId` CHAR(36) NOT NULL,
    `documentId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `application_documents_documentId_idx`(`documentId`),
    PRIMARY KEY (`applicationId`, `documentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_documents` ADD CONSTRAINT `application_documents_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `job_applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_documents` ADD CONSTRAINT `application_documents_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
