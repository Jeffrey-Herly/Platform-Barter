// Import modular functions
import { isValidEmail, validatePassword } from '../module/validators/userValidator.js';
import { sendSuccess, sendError, sendValidationError } from '../module/services/responseService.js';
import { getCurrentTimestamp } from '../module/utils/dateHelper.js';

export default async function loginRoutes(app, opts) {
  
    // Route for rendering login page
    app.get('/login', async (req, reply) => {
        try {
            console.log('berhasil masuk ke login');
            return reply.view('login.njk', { title: 'Login Page' });
        }
        catch (err) {
            console.error(err);
            return reply.status(500).send('Internal Server Error');
        }
    });

    // Route for handling login authentication (hardcoded)
    app.post('/login', async (req, reply) => {
        console.log('Login attempt received at:', getCurrentTimestamp());
        try {
            const { email, password } = req.body;
            console.log(`Received credentials - Email: ${email}`);
            
            // Validate input using modular functions
            const validationErrors = [];
            
            if (!email || !isValidEmail(email)) {
                validationErrors.push('Email tidak valid');
            }
            
            if (!password) {
                validationErrors.push('Password tidak boleh kosong');
            }
            
            if (validationErrors.length > 0) {
                return sendValidationError(reply, validationErrors);
            }
            
            // Hardcoded credentials for testing
            const validCredentials = [
                { email: 'admin@barter.com', password: 'admin123', role: 'admin', name: 'Admin User' },
                { email: 'user@barter.com', password: 'user123', role: 'user', name: 'Regular User' },
                { email: 'john@example.com', password: 'password123', role: 'user', name: 'John Doe' }
            ];

            // Check credentials
            const user = validCredentials.find(
                cred => cred.email === email && cred.password === password
            );

            if (user) {
                // Login successful - using modular response service
                console.log(`Login successful for: ${user.email}`);
                const userData = {
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    loginTime: getCurrentTimestamp()
                };
                
                return sendSuccess(reply, { user: userData }, 'Login berhasil');
            } else {
                // Login failed - using modular response service
                console.log(`Login failed for: ${email}`);
                return sendError(reply, 'Email atau password salah', 401);
            }
        }
        catch (err) {
            console.error('Login error:', err);
            return sendError(reply, 'Internal Server Error', 500);
        }
    });

}