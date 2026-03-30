// Import modular functions
import { formatDateID, getCurrentTimestamp } from '../module/utils/dateHelper.js';
import { capitalizeWords } from '../module/utils/stringHelper.js';
import { sendSuccess, sendError } from '../module/services/responseService.js';

export default async function routes(app, opts) {
  // Route untuk menampilkan tampilan dari views/index.njk

  app.get('/index', async (req, reply) => {
    console.log('berhasil masuk ke index');
    return reply.view('index.njk', { title: 'Welcome to Index Page' });
  });

  // Route halaman kedua untuk tes navigasi
  app.get('/second', async (req, reply) => {
    console.log('masuk ke second');
    return reply.view('second.njk', { title: 'Second Page' });
  });

  // API: hardcoded data untuk Webix (menggunakan modular functions)
  app.get('/api/users', async (req, reply) => {
    try {
      const users = [
        { id: 1, name: 'John Doe', age: 30, email: 'john@example.com', role: 'Admin' },
        { id: 2, name: 'Jane Smith', age: 25, email: 'jane@example.com', role: 'Editor' },
        { id: 3, name: 'Sam Johnson', age: 35, email: 'sam@example.com', role: 'Viewer' },
        { id: 4, name: 'Alice Lee', age: 28, email: 'alice@example.com', role: 'Editor' }
      ];
      
      // Menggunakan modular function untuk format nama
      const formattedUsers = users.map(user => ({
        ...user,
        name: capitalizeWords(user.name),
        lastUpdated: getCurrentTimestamp()
      }));
      
      return sendSuccess(reply, formattedUsers, 'Data users berhasil diambil');
    } catch (err) {
      console.error('Error getting users:', err);
      return sendError(reply, 'Gagal mengambil data users', 500);
    }
  });

  // Route tambahan (contoh menggunakan modular functions)
  app.get('/about', async (req, reply) => {
    try {
      const aboutData = {
        appName: 'TTU Platform',
        version: '1.0.0',
        description: 'Platform Barter menggunakan Fastify',
        lastUpdated: formatDateID(new Date()),
        timestamp: getCurrentTimestamp()
      };
      
      return sendSuccess(reply, aboutData, 'Informasi aplikasi');
    } catch (err) {
      return sendError(reply, 'Gagal mengambil informasi aplikasi', 500);
    }
  });

  // Route dengan parameter (menggunakan modular functions)
  app.get('/hello/:name', async (req, reply) => {
    try {
      const { name } = req.params;
      
      if (!name || name.trim().length === 0) {
        return sendError(reply, 'Nama tidak boleh kosong', 400);
      }
      
      const formattedName = capitalizeWords(name.trim());
      const responseData = {
        originalName: name,
        formattedName: formattedName,
        greeting: `Hello, ${formattedName}!`,
        timestamp: getCurrentTimestamp()
      };
      
      return sendSuccess(reply, responseData, 'Greeting berhasil dibuat');
    } catch (err) {
      return sendError(reply, 'Gagal membuat greeting', 500);
    }
  });
}