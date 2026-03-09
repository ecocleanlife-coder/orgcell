const fs = require('fs');

async function testUpload() {
    try {
        const imagePath = 'C:\\nci_app\\nci_sage_pro\\frontend\\public\\vite.svg';
        if (!fs.existsSync(imagePath)) {
            console.error('Test image not found');
            return;
        }

        const fileBuffer = fs.readFileSync(imagePath);
        const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

        let body = '';
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="room_code"\r\n\r\n`;
        body += `test_room\r\n`;
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="photos"; filename="vite.svg"\r\n`;
        body += `Content-Type: image/svg+xml\r\n\r\n`;

        const payload = Buffer.concat([
            Buffer.from(body, 'utf8'),
            fileBuffer,
            Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'),
        ]);

        const res = await fetch('http://localhost:5001/api/sharing/upload', {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoxfSwiaWF0IjoxNzczMDcxMjU.U2LCJleHAiOjE3NzMwNzQ4NTZ9.pLzodI5CnDpZc_X4rkDyjtuhyh5q6_B67SJDjeun80g`
            },
            body: payload
        });

        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', data);
    } catch (err) {
        console.error('Error Details:', err.message);
    }
}

testUpload();
