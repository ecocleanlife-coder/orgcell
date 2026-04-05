import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 30000,
    retries: 0,
    use: {
        baseURL: 'http://localhost:5173',
        viewport: { width: 375, height: 812 }, // iPhone SE mobile
        screenshot: 'on',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'mobile-chrome',
            use: { browserName: 'chromium', isMobile: true },
        },
    ],
    webServer: {
        command: 'npm run dev',
        port: 5173,
        reuseExistingServer: true,
        timeout: 30000,
    },
});
