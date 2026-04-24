'use strict';

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * File Upload Utility
 * Menangani penyimpanan file gambar untuk items dan profil user
 */

const ITEMS_UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'items');
const AVATAR_UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
const COVER_UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'covers');
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Magic bytes signatures untuk deteksi file type
 * Format: [signatureBuffer, mimeType, extension]
 */
const MAGIC_BYTES = {
    JPEG: { sig: Buffer.from([0xFF, 0xD8, 0xFF]), type: 'image/jpeg', ext: '.jpg' },
    PNG: { sig: Buffer.from([0x89, 0x50, 0x4E, 0x47]), type: 'image/png', ext: '.png' },
    GIF87: { sig: Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37]), type: 'image/gif', ext: '.gif' },
    GIF89: { sig: Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39]), type: 'image/gif', ext: '.gif' },
    WEBP: { sig: Buffer.from([0x52, 0x49, 0x46, 0x46]), type: 'image/webp', ext: '.webp' }
};

/**
 * Detect MIME type by checking magic bytes
 * @param {Buffer} buffer - File buffer
 * @returns {Object|null} {type: mimeType, ext: extension} atau null jika tidak valid
 */
function detectMimeByMagicBytes(buffer) {
    if (!buffer || buffer.length < 4) return null;

    // Check JPEG
    if (buffer.length >= 3 && 
        buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return MAGIC_BYTES.JPEG;
    }

    // Check PNG
    if (buffer.length >= 4 && 
        buffer[0] === 0x89 && buffer[1] === 0x50 && 
        buffer[2] === 0x4E && buffer[3] === 0x47) {
        return MAGIC_BYTES.PNG;
    }

    // Check GIF87a
    if (buffer.length >= 5 && 
        buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 &&
        buffer[3] === 0x38 && buffer[4] === 0x37) {
        return MAGIC_BYTES.GIF87;
    }

    // Check GIF89a
    if (buffer.length >= 5 && 
        buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 &&
        buffer[3] === 0x38 && buffer[4] === 0x39) {
        return MAGIC_BYTES.GIF89;
    }

    // Check WEBP (RIFF....WEBP format)
    if (buffer.length >= 12 && 
        buffer[0] === 0x52 && buffer[1] === 0x49 && 
        buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && 
        buffer[10] === 0x42 && buffer[11] === 0x50) {
        return MAGIC_BYTES.WEBP;
    }

    return null;
}

/**
 * Initialize upload directory
 */
async function initializeUploadDir() {
    try {
        await fs.mkdir(ITEMS_UPLOAD_DIR, { recursive: true });
        await fs.mkdir(AVATAR_UPLOAD_DIR, { recursive: true });
        await fs.mkdir(COVER_UPLOAD_DIR, { recursive: true });
    } catch (error) {
        console.error('Failed to create upload directory:', error);
        throw error;
    }
}

/**
 * Internal helper untuk menyimpan file ke direktori tertentu
 * @param {Buffer} buffer
 * @param {string} originalFilename
 * @param {string} targetDir
 * @param {string} urlPrefix
 * @returns {Promise<Object>}
 */
async function saveFileToDir(buffer, originalFilename, targetDir, urlPrefix) {
    // Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Validate MIME type by extension
    const ext = path.extname(originalFilename).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!allowedExtensions.includes(ext)) {
        throw new Error(`File type ${ext} is not allowed. Allowed types: ${allowedExtensions.join(', ')}`);
    }

    // Detect actual MIME type using magic bytes for enhanced security
    const detectedMime = detectMimeByMagicBytes(buffer);
    if (!detectedMime) {
        throw new Error(`File is not a valid image. Only JPEG, PNG, GIF, and WEBP are allowed.`);
    }

    // Verify detected type matches file extension
    const detectedExt = detectedMime.ext;
    if (ext !== detectedExt && !(ext === '.jpg' && detectedExt === '.jpeg') && !(ext === '.jpeg' && detectedExt === '.jpg')) {
        throw new Error(`File extension (${ext}) does not match actual file type (${detectedMime.type}). Possible file spoofing detected.`);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(4).toString('hex');
    const filename = `${timestamp}_${randomStr}${ext}`;
    const filepath = path.join(targetDir, filename);

    try {
        await fs.writeFile(filepath, buffer);
        const publicUrl = `${urlPrefix}${filename}`;

        return {
            filename,
            originalName: originalFilename,
            url: publicUrl,
            path: filepath,
            size: buffer.length
        };
    } catch (error) {
        throw new Error(`Failed to save file: ${error.message}`);
    }
}

/**
 * Save single image file
 * @param {Buffer} buffer - File buffer
 * @param {string} originalFilename - Original filename
 * @returns {Promise<Object>} Saved file info {filename, url, path}
 */
async function saveImageFile(buffer, originalFilename) {
    return saveFileToDir(buffer, originalFilename, ITEMS_UPLOAD_DIR, '/uploads/items/');
}

/**
 * Save multiple image files
 * @param {Array} files - Array of file objects with buffer and filename
 * @returns {Promise<Array>} Array of saved file info
 */
async function saveImageFiles(files) {
    if (!files || files.length === 0) {
        return [];
    }

    const savedFiles = [];

    for (const file of files) {
        try {
            const savedFile = await saveImageFile(file.buffer, file.filename);
            savedFiles.push(savedFile);
        } catch (error) {
            console.error(`Failed to save file ${file.filename}:`, error);
            // Continue with next file instead of throwing
        }
    }

    return savedFiles;
}

/**
 * Delete image file
 * @param {string} filename - Filename to delete
 * @returns {Promise<boolean>} Success status
 */
async function deleteImageFile(filename) {
    const filepath = path.join(ITEMS_UPLOAD_DIR, filename);

    try {
        // Prevent directory traversal attacks
        const resolvedPath = path.resolve(filepath);
        const resolvedDir = path.resolve(ITEMS_UPLOAD_DIR);

        if (!resolvedPath.startsWith(resolvedDir)) {
            throw new Error('Invalid file path');
        }

        await fs.unlink(filepath);
        return true;
    } catch (error) {
        console.error(`Failed to delete file ${filename}:`, error);
        return false;
    }
}

/**
 * Save avatar image file
 * @param {Buffer} buffer
 * @param {string} originalFilename
 * @returns {Promise<Object>}
 */
async function saveAvatarFile(buffer, originalFilename) {
    return saveFileToDir(buffer, originalFilename, AVATAR_UPLOAD_DIR, '/uploads/avatars/');
}

/**
 * Save profile cover/banner image file
 * @param {Buffer} buffer
 * @param {string} originalFilename
 * @returns {Promise<Object>}
 */
async function saveCoverFile(buffer, originalFilename) {
    return saveFileToDir(buffer, originalFilename, COVER_UPLOAD_DIR, '/uploads/covers/');
}

module.exports = {
    initializeUploadDir,
    saveImageFile,
    saveImageFiles,
    deleteImageFile,
    ITEMS_UPLOAD_DIR,
    AVATAR_UPLOAD_DIR,
    COVER_UPLOAD_DIR,
    saveAvatarFile,
    saveCoverFile,
    detectMimeByMagicBytes,
    MAX_FILE_SIZE,
    ALLOWED_MIME_TYPES
};
