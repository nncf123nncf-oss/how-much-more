// 投稿カード用の実画面を撮る(Chrome headless / CDP)。実行: node source/shoot.js <出力フォルダ> [YYYY-MM-DD]
const fs = require('fs'), path = require('path');
const { launch } = require('./cdp');
const OUT = path.resolve(process.argv[2]); const DATE = process.argv[3] || '2026-10-20';
const PAGE = 'file:///' + path.resolve(__dirname, '..', 'index.html').split(path.sep).join('/');
fs.mkdirSync(OUT, { recursive: true });
// Card2の入力（すべて架空・今月の目標）。単価は未入力
const CARD2 = { goal: '300000', raised: '120000', start: '2026-10-01', end: '2026-10-31', today: '2026-10-20', perweek: '4' };
(async () => {
  const b = await launch(9392);
  const rect = sel => b.ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return {top:r.top+scrollY,bottom:r.bottom+scrollY,left:r.left,right:r.right,h:r.height}})()`);
  // Card1: デスクトップ1100px(日付3欄が並ぶ幅)・2カラム。サンプルA
  await b.open(PAGE, 1100, 1300, 2, false);
  await b.ev(`document.getElementById('sample').click()`); await b.sleep(400);
  const lay = await rect('.layout'), out = await rect('.sticky'), inp = await rect('.layout > .panel');
  console.log('card1', JSON.stringify({ lay, out, inp }));
  await b.shot(path.join(OUT, '01-x-primary-desktop-sample-' + DATE + '.png'), { x: lay.left - 8, y: Math.max(0, lay.top - 12), width: lay.right - lay.left + 16, height: Math.max(out.bottom, inp.bottom) - lay.top + 20 });
  await b.shot(path.join(OUT, 'source-desktop-full.png'), { x: 0, y: 0, width: 1100, height: await b.ev('document.documentElement.scrollHeight') });
  // Card2: 375px・DPR2。別の入力（今月の目標・1か月あたりが出ない・単価なし）
  await b.open(PAGE, 375, 900, 2, true);
  await b.ev(`(()=>{const D=${JSON.stringify(CARD2)};for(const k in D){const e=document.getElementById(k);e.value=D[k];e.dispatchEvent(new Event('input',{bubbles:true}));}})()`);
  await b.sleep(400);
  const h2 = await rect('#out-h'), res = await rect('#results');
  console.log('card2', JSON.stringify({ h2, res }));
  await b.shot(path.join(OUT, '02-mobile375-month-goal-' + DATE + '.png'), { x: 0, y: h2.top - 8, width: 375, height: res.bottom - h2.top + 16 });
  await b.shot(path.join(OUT, 'source-mobile375-full.png'), { x: 0, y: 0, width: 375, height: await b.ev('document.documentElement.scrollHeight') });
  console.log(await b.ev(`document.getElementById('results').innerText.replace(/\\n+/g,' / ')`));
  b.close(); setTimeout(() => process.exit(0), 300);
})().catch(e => { console.error(e); process.exit(2); });
