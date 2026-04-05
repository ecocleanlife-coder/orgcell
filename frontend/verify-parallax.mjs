import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

    await page.goto('http://localhost:5173/demo', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Screenshot 1: 기본 뷰 (중앙)
    await page.screenshot({ path: 'verify-3d-center.png', fullPage: false });
    console.log('✅ Screenshot 1: Center view');

    // 3D 면 확인
    const fronts = await page.locator('[data-testid="cube3d-front"]').count();
    const lefts = await page.locator('[data-testid="cube3d-left"]').count();
    const rights = await page.locator('[data-testid="cube3d-right"]').count();
    const tops = await page.locator('[data-testid="cube3d-top"]').count();
    const bottoms = await page.locator('[data-testid="cube3d-bottom"]').count();
    const backs = await page.locator('[data-testid="cube3d-back"]').count();
    console.log(`  Faces — front:${fronts} left:${lefts} right:${rights} top:${tops} bottom:${bottoms} back:${backs}`);

    // perspective 확인
    const perspDiv = await page.locator('[style*="perspective"]').first();
    if (await perspDiv.count() > 0) {
        const style = await perspDiv.getAttribute('style');
        console.log(`  Perspective style: ${style?.substring(0, 120)}...`);
    }

    // Screenshot 2: 왼쪽으로 드래그 (우측면 더 보이도록)
    const canvas = page.locator('[data-testid="tree-canvas"]');
    const box = await canvas.boundingBox();
    if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 300, box.y + box.height / 2, { steps: 20 });
        await page.mouse.up();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'verify-3d-panned-right.png', fullPage: false });
        console.log('✅ Screenshot 2: Panned right (left blocks show right face)');

        // 반대쪽으로
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 - 500, box.y + box.height / 2, { steps: 20 });
        await page.mouse.up();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'verify-3d-panned-left.png', fullPage: false });
        console.log('✅ Screenshot 3: Panned left (right blocks show left face)');
    }

    await browser.close();
    console.log('\n🏁 Verification complete');
})();
