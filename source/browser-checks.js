// 実ブラウザ検算(S10)。node source/browser-checks.js
const path = require('path'); const { launch } = require('./cdp');
const PAGE = 'file:///' + path.resolve(__dirname, '..', 'index.html').split(path.sep).join('/');
let ng = 0; const ck = (n, ok, extra) => { if (!ok) ng++; console.log(ok ? 'OK ' : 'NG ', n, ok ? '' : JSON.stringify(extra)); };
(async () => {
  const b = await launch(9391);
  const txt = () => b.ev(`document.getElementById('results').innerText`);
  const set = (id, v) => b.ev(`(()=>{const e=document.getElementById(${JSON.stringify(id)});e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await b.open(PAGE, 1000, 1300, 1, false);
  let t = await txt(); ck('初期は案内', t.includes('入れると、ここに出ます'), t);
  await b.ev(`document.getElementById('sample').click()`); await b.sleep(200); t = await txt();
  for (const s of ['2,100,000円', '875,000円', '201,370円', '40,274円', '52.1日', '47件', '4.5件', '93,174円', '約2.2倍', '4,858,362円', '1,141,638円 不足']) ck('A:' + s, t.includes(s), t);
  await set('goal', '３，０００'); await set('raised', '0'); await b.sleep(100); t = await txt(); ck('全角入力で再計算', t.includes('あと'), t);
  ck('0円は倍率なし', t.includes('倍率は出せません'), t);
  await set('goal', ''); await set('raised', ''); await b.sleep(100); t = await txt(); ck('空に戻る', t.includes('入れると、ここに出ます'), t);
  await b.ev(`document.getElementById('sample').click()`); await set('today', '2026-12-26'); await b.sleep(100); t = await txt();
  ck('残り6日は1週間あたりなし', !t.includes('1週間あたり') && t.includes('1日あたり'), t);
  await set('today', '2027-01-05'); await b.sleep(100);
  ck('日付エラー表示', await b.ev(`!document.getElementById('dates-err').hidden`), 0);
  ck('Infinity/NaNなし', !/NaN|Infinity|undefined/.test(await b.ev(`document.body.innerText`)), 0);
  for (const [w, scheme] of [[375, 'light'], [375, 'dark'], [320, 'light']]) {
    await b.open(PAGE, w, 900, 2, true, scheme); await b.ev(`document.getElementById('sample').click()`); await b.sleep(200);
    const o = await b.ev(`({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,small:[...document.querySelectorAll('button,input,select,summary')].filter(e=>e.getBoundingClientRect().height<43.5).map(e=>e.id||e.tagName),fs:[...document.querySelectorAll('input,select')].filter(e=>parseFloat(getComputedStyle(e).fontSize)<16).length})`);
    ck(`幅${w}${scheme} 横スクロールなし`, o.sw <= o.cw, o); ck(`幅${w}${scheme} 44px/16px`, o.small.length === 0 && o.fs === 0, o);
  }
  for (const scheme of ['light', 'dark']) {
    await b.open(PAGE, 1000, 900, 1, false, scheme); await b.ev(`document.getElementById('sample').click()`); await b.sleep(200);
    const r = await b.ev(`(()=>{const lum=c=>{const m=c.match(/[0-9.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};
      const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
      const bg=getComputedStyle(document.body).backgroundColor, cs=s=>getComputedStyle(document.querySelector(s));
      return {ink_bg:cr(cs('.lead').color,bg),btn:cr(cs('#sample').color,cs('#sample').backgroundColor),hint:cr(cs('.hint').color,cs('.panel').backgroundColor),big:cr(cs('.remain .big').color,cs('.remain').backgroundColor)}})()`);
    ck('コントラスト ' + scheme, Object.values(r).every(v => v >= 4.5), r);
  }
  b.close(); console.log(ng ? 'NG ' + ng : 'ALL OK'); setTimeout(() => process.exit(ng ? 1 : 0), 300);
})().catch(e => { console.error(e); process.exit(2); });
