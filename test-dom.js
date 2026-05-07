const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const result = await page.evaluate(() => {
    const div = document.createElement('div');
    div.innerHTML = 'Hello<br>World<p>Paragraph</p>';
    return {
      innerText: div.innerText,
      textContent: div.textContent
    };
  });
  console.log(result);
  await browser.close();
})();
