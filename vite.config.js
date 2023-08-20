import "dotenv/config";
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    port: process.env.SERVER_PORT,
    host: 'localhost'
  },
  preview: {
    port: process.env.SERVER_PORT,
    host: 'localhost'
  }
})
