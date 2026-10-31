import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests',use:{baseURL:'http://127.0.0.1:5173',launchOptions:{executablePath:'/usr/bin/chromium',args:['--no-sandbox']},viewport:{width:1440,height:1000}},reporter:'list'});
