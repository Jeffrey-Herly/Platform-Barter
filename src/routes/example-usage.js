/**
 * Contoh penggunaan sistem modularitas
 * File ini menunjukkan berbagai cara mengimport dan menggunakan modul
 */

// Cara 1: Import individual functions
import { formatDateID, getCurrentTimestamp } from '../module/utils/dateHelper.js';
import { capitalizeWords, slugify } from '../module/utils/stringHelper.js';
import { isValidEmail } from '../module/validators/userValidator.js';

// Cara 2: Import semua dari satu modul dengan alias
import * as ResponseService from '../module/services/responseService.js';
import * as StringUtils from '../module/utils/stringHelper.js';

// Cara 3: Import dari index.js (central export)
import { DateUtils, UserValidator } from '../module/index.js';

export default async function exampleRoutes(app, opts) {
  
  // Contoh route yang menggunakan berbagai modul
  app.get('/example', async (req, reply) => {
    try {
      // Menggunakan date helper
      const currentDate = new Date();
      const formattedDate = formatDateID(currentDate);
      const timestamp = getCurrentTimestamp();
      
      // Menggunakan string helper
      const title = capitalizeWords('contoh penggunaan modul');
      const slug = slugify('Contoh Penggunaan Modul 123!');
      
      // Menggunakan validator
      const email = 'test@example.com';
      const isEmailValid = isValidEmail(email);
      
      // Menggunakan modul dengan namespace
      const randomString = StringUtils.generateRandomString(10);
      
      const data = {
        date: {
          formatted: formattedDate,
          timestamp: timestamp
        },
        text: {
          title: title,
          slug: slug,
          random: randomString
        },
        validation: {
          email: email,
          isValid: isEmailValid
        }
      };
      
      // Menggunakan response service dengan namespace
      return ResponseService.sendSuccess(reply, data, 'Contoh berhasil');
      
    } catch (err) {
      console.error('Example error:', err);
      return ResponseService.sendError(reply, 'Terjadi kesalahan', 500);
    }
  });
  
  // Contoh route untuk validasi form
  app.post('/validate-user', async (req, reply) => {
    try {
      const { name, email, phone, password } = req.body;
      const errors = [];
      
      // Validasi menggunakan modul validator
      if (!name || name.trim().length < 2) {
        errors.push('Nama minimal 2 karakter');
      }
      
      if (!isValidEmail(email)) {
        errors.push('Format email tidak valid');
      }
      
      // Menggunakan validator dengan namespace dari index
      if (!UserValidator.isValidPhoneID(phone)) {
        errors.push('Nomor telepon tidak valid');
      }
      
      const passwordValidation = UserValidator.validatePassword(password);
      if (!passwordValidation.isValid) {
        errors.push(passwordValidation.message);
      }
      
      if (errors.length > 0) {
        return ResponseService.sendValidationError(reply, errors);
      }
      
      // Jika semua valid, format data
      const userData = {
        name: capitalizeWords(name.trim()),
        email: email.toLowerCase(),
        phone: phone,
        slug: slugify(name),
        createdAt: DateUtils.getCurrentTimestamp()
      };
      
      return ResponseService.sendSuccess(reply, userData, 'Validasi berhasil');
      
    } catch (err) {
      console.error('Validation error:', err);
      return ResponseService.sendError(reply, 'Terjadi kesalahan validasi', 500);
    }
  });
}
