import { test, expect } from '@playwright/test';

test.describe('InputForm Generate', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    // Wait for the app to render the input box
    await page.waitForSelector('[data-click="text-input"]', { timeout: 30000 });
  });

  test('typing custom text and clicking Generate uses that text', async ({ page }) => {
    // Clear the contenteditable and type custom text
    const textBox = page.locator('.text-box[contenteditable]');
    await textBox.click();
    await textBox.fill('');
    await textBox.pressSequentially('Xin chào', { delay: 50 });

    // Verify the text box has our text
    const textBefore = await textBox.innerText();
    expect(textBefore.trim()).toBe('Xin chào');

    // Click Generate
    const generateBtn = page.locator('[data-click="generate-btn"]');
    await generateBtn.click();

    // Wait for model to finish
    await page.waitForTimeout(3000);

    // The text box should contain "Xin chào" + predicted token, NOT the example text
    const textAfter = await textBox.innerText();
    expect(textAfter.trim()).not.toContain('Trực quan hóa');
    expect(textAfter.trim()).toStartWith('Xin chào');
  });

  test('Generate does not duplicate tokens', async ({ page }) => {
    // Wait for initial prediction to appear
    await page.waitForSelector('.predicted span', { timeout: 30000 });
    
    // Read current input and predicted token
    const textBox = page.locator('.text-box[contenteditable]');
    const inputBefore = await textBox.innerText();
    const predicted = await page.locator('.predicted span').innerText();

    // Click Generate
    await page.locator('[data-click="generate-btn"]').click();
    await page.waitForTimeout(3000);

    // The input should now contain the old input + predicted token (merged)
    const inputAfter = await textBox.innerText();
    const expected = (inputBefore + predicted).replace(/[\s\n]+/g, ' ').trim();
    expect(inputAfter.trim()).toBe(expected);

    // The new predicted token should NOT be a duplicate of the one just merged
    // (it should be a different next token)
  });
});
