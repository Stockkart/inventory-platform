// Auth routes
export { default as LoginPage } from './lib/routes/login';
export { default as SignupPage } from './lib/routes/signup';
export { default as ForgotPasswordPage } from './lib/routes/forgot-password';
export { default as ResetPasswordPage } from './lib/routes/reset-password';

// Re-export meta functions
export { meta as loginMeta } from './lib/routes/login';
export { meta as signupMeta } from './lib/routes/signup';
export { meta as forgotPasswordMeta } from './lib/routes/forgot-password';
export { meta as resetPasswordMeta } from './lib/routes/reset-password';

