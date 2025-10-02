# Sistem Modularitas TTU

Direktori ini berisi fungsi-fungsi modular yang dapat digunakan di seluruh aplikasi.

## Struktur Direktori

```
src/module/
├── utils/              # Fungsi utility umum
│   ├── dateHelper.js   # Helper untuk tanggal
│   └── stringHelper.js # Helper untuk string
├── services/           # Business logic & service layer
│   └── responseService.js # Standardized API responses
├── validators/         # Validasi data
│   └── userValidator.js   # Validasi user
├── middleware/         # Custom middleware (akan ditambah)
├── helpers/           # Helper functions (akan ditambah)
├── index.js           # Central export file
└── README.md          # Dokumentasi ini
```

## Cara Penggunaan

### 1. Import Individual Functions
```javascript
import { formatDateID, getCurrentTimestamp } from '../module/utils/dateHelper.js';
import { capitalizeWords, slugify } from '../module/utils/stringHelper.js';
import { isValidEmail } from '../module/validators/userValidator.js';
```

### 2. Import dengan Namespace
```javascript
import * as DateUtils from '../module/utils/dateHelper.js';
import * as StringUtils from '../module/utils/stringHelper.js';
import * as ResponseService from '../module/services/responseService.js';

// Penggunaan
const date = DateUtils.formatDateID(new Date());
const slug = StringUtils.slugify('My Title');
ResponseService.sendSuccess(reply, data, 'Success');
```

### 3. Import dari Central Export (Recommended)
```javascript
import { 
  formatDateID, 
  capitalizeWords, 
  isValidEmail, 
  sendSuccess 
} from '../module/index.js';

// Atau dengan namespace
import { DateUtils, StringUtils, UserValidator } from '../module/index.js';
```

## Modul yang Tersedia

### DateHelper (`utils/dateHelper.js`)
- `formatDateID(date)` - Format tanggal ke bahasa Indonesia
- `getCurrentTimestamp()` - Dapatkan timestamp saat ini
- `isValidDate(date)` - Validasi apakah tanggal valid

### StringHelper (`utils/stringHelper.js`)
- `capitalizeWords(str)` - Kapitalisasi setiap kata
- `generateRandomString(length)` - Generate string random
- `slugify(str)` - Buat slug untuk URL

### UserValidator (`validators/userValidator.js`)
- `isValidEmail(email)` - Validasi format email
- `validatePassword(password)` - Validasi kekuatan password
- `isValidPhoneID(phone)` - Validasi nomor telepon Indonesia

### ResponseService (`services/responseService.js`)
- `sendSuccess(reply, data, message, statusCode)` - Response sukses
- `sendError(reply, message, statusCode, errors)` - Response error
- `sendValidationError(reply, validationErrors)` - Response validation error
- `sendNotFound(reply, resource)` - Response not found

## Contoh Penggunaan Lengkap

Lihat file `src/routes/example-usage.js` untuk contoh implementasi lengkap.

## Best Practices

1. **Gunakan ES Modules**: Semua modul menggunakan `export`/`import`
2. **Dokumentasi JSDoc**: Setiap fungsi memiliki dokumentasi yang jelas
3. **Single Responsibility**: Setiap modul memiliki tanggung jawab yang spesifik
4. **Consistent Naming**: Gunakan naming convention yang konsisten
5. **Error Handling**: Selalu handle error dengan baik
6. **Type Safety**: Validasi input parameter

## Menambah Modul Baru

1. Buat file di direktori yang sesuai (`utils/`, `services/`, `validators/`, dll.)
2. Export fungsi menggunakan named exports
3. Tambahkan export ke `index.js`
4. Dokumentasikan dengan JSDoc
5. Update README ini jika perlu

## Contoh Template Modul Baru

```javascript
/**
 * Deskripsi modul
 */

/**
 * Deskripsi fungsi
 * @param {type} param - Deskripsi parameter
 * @returns {type} Deskripsi return value
 */
export function namaFungsi(param) {
  // Implementation
  return result;
}
```
