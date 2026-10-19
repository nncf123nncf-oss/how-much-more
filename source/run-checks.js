// 計算部分(script#core)だけを取り出して検算する。node source/run-checks.js
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
const HM = new Function(m[1] + '; return HM;')();
let pass = 0, fail = 0;
function eq(name, got, exp) { const ok = JSON.stringify(got) === JSON.stringify(exp); if (ok) pass++; else { fail++; console.log('NG', name, 'got', JSON.stringify(got), 'exp', JSON.stringify(exp)); } }
const A = { goal: '6000000', raised: '3900000', start: '2026-01-01', end: '2026-12-31', today: '2026-10-20', perWeek: '5', price: '45000' };
const B = { goal: '300000', raised: '120000', start: '2026-10-01', end: '2026-10-31', today: '2026-10-20', perWeek: '4', price: '' };
const C = (o, base) => HM.compute(Object.assign({}, base || A, o));
const f = HM.fmt;
// S1
let r = HM.compute({ goal: '', raised: '', start: '', end: '', today: '', perWeek: '5', price: '' });
eq('S1 blank', r.blank, true); eq('S1 no ok', !!r.ok, false);
eq('S1 goal only', Object.keys(C({ raised: '' }).errors), ['raised']);
// S2 A
r = C({});
eq('A basic', [r.elapsed, r.remain, r.total, r.R], [293, 73, 365, 2100000]);
eq('A monthly', f(r.monthly), '875,000'); eq('A weekly', f(r.weekly), '201,370'); eq('A workDays', HM.round1(r.workDays), 52.1);
eq('A perWorkDay', f(r.perWorkDay), '40,274'); eq('A count', [r.count, r.countWeekly], [47, 4.5]);
eq('A pace', f(r.paceUnit), '93,174'); eq('A need', f(r.needUnit), '201,370'); eq('A ratio', r.ratio, 2.2);
eq('A proj', [r.projected, r.diff, r.projected + r.diff], [4858362, 1141638, 6000000]);
// S2 B
r = C({}, B);
eq('B basic', [r.elapsed, r.remain, r.total, r.R], [20, 12, 31, 180000]);
eq('B no monthly', r.monthly, null); eq('B weekly', f(r.weekly), '105,000'); eq('B workDays', HM.round1(r.workDays), 6.9);
eq('B perWorkDay', f(r.perWorkDay), '26,250'); eq('B no count', r.count, undefined);
eq('B pace', [f(r.paceUnit), f(r.needUnit), r.ratio], ['42,000', '105,000', 2.5]); eq('B proj', [r.projected, r.diff], [186000, 114000]);
// S3 入力形式
const Y = HM.parseYen;
eq('fw', Y('６，０００，０００').value, 6000000); eq('en', Y('6000000円').value, 6000000); eq('comma', Y('6,000,000').value, 6000000);
eq('decimal', !!Y('6,000,000.5').error, true); eq('neg', !!Y('-1').error, true); eq('abc', !!Y('abc').error, true); eq('space only', !!Y('   ').empty, true);
eq('inner space', Y('１ ５').value, 15); eq('zero', Y('0').value, 0); eq('max', Y('999999999').value, 999999999); eq('over', !!Y('1000000000').error, true);
eq('yen only', !!Y('円').error, true);
// S4 日付
eq('today=start', C({ today: '2026-01-01' }).elapsed, 1);
r = C({ today: '2026-12-31' }); eq('today=end', [r.remain, r.weekly, r.monthly], [1, null, null]);
eq('today>end', !!C({ today: '2027-01-01' }).errors.dates, true); eq('today<start', !!C({ today: '2025-12-31' }).errors.dates, true);
eq('start>end', !!C({ start: '2027-01-01' }).errors.dates, true);
r = C({ start: '2028-01-01', end: '2028-12-31', today: '2028-03-01' }); eq('leap total', [r.total, r.elapsed], [366, 61]);
r = C({ start: '2028-02-28', end: '2028-03-01', today: '2028-02-28' }); eq('leap span', r.total, 3);
eq('over span', !!C({ start: '2016-01-01', end: '2026-12-31', today: '2026-01-01' }).errors.dates, true);
eq('exactly 3660', C({ start: '2016-01-01', end: '2025-12-31', today: '2025-12-31' }).errors.dates, undefined);
eq('bad date', !!C({ end: '2026-02-30' }).errors.dates, true); eq('empty date', !!C({ today: '' }).errors.dates, true);
// S5 金額
r = C({ raised: '0' }); eq('raised 0', [r.ratio, r.ok, r.projected], [null, true, 0]);
r = C({ raised: '6000000' }); eq('R=0', [r.done, r.over, r.weekly], [true, 0, undefined]);
r = C({ raised: '7000000' }); eq('over', [r.done, r.over], [true, 1000000]);
eq('goal max over', !!C({ goal: '1000000000' }).errors.goal, true);
// S6 切り上げ
eq('exact 42', C({ price: '50000' }).count, 42); eq('47', C({}).count, 47); eq('price 0', !!C({ price: '0' }).errors.price, true);
eq('price blank', C({ price: '' }).count, undefined); eq('price>R', C({ price: '5000000' }).count, 1);
eq('price 1', C({ price: '1' }).count, 2100000);
// S7 丸め
eq('round .5', f(0.5), '1'); eq('neg', f(-1200), '−1,200'); eq('proj sum', (() => { const q = C({ raised: '1234567' }); return q.projected + q.diff; })(), 6000000);
// S8 閾値
for (const [today, wk, mo] of [['2026-12-25', true, false], ['2026-12-26', false, false], ['2026-12-01', true, true], ['2026-12-02', true, false]]) {
  const q = C({ today }); eq('thr ' + today + ' rem ' + q.remain, [q.weekly !== null, q.monthly !== null], [wk, mo]);
}
eq('thr6', C({ today: '2026-12-26' }).unit, 'day'); eq('thr7', C({ today: '2026-12-25' }).unit, 'week');
eq('rem 31', C({ today: '2026-12-01' }).remain, 31); eq('rem 30', C({ today: '2026-12-02' }).remain, 30);
// 稼働日数の選択
eq('pw invalid', C({ perWeek: 'x' }).perWeek, 5); eq('pw 0', C({ perWeek: '0' }).perWeek, 5); eq('pw 7', C({ perWeek: '7' }).perWeek, 7);
// 値が有限
const all = [C({}), C({}, B), C({ raised: '0' }), C({ today: '2026-12-31' })];
eq('finite', all.every(q => ['weekly', 'monthly', 'perWorkDay', 'paceDay', 'needDay', 'projected'].every(k => q[k] == null || Number.isFinite(q[k]))), true);
// レビュー①の反映
eq('comma ok', Y('3,900,000').value, 3900000); eq('comma bad 1', !!Y('3,9000,000').error, true); eq('comma bad 2', !!Y('1,2').error, true); eq('comma bad 3', !!Y(',100').error, true);
eq('comma fw', Y('３，９００，０００円').value, 3900000);
eq('ratioRaw small', C({ goal: '1000', raised: '999', today: '2026-01-01' }).ratioRaw < 0.1, true);
eq('empty flag', C({ raised: '' }).emptyErr.raised, true);
eq('weekly=needUnit', (() => { const q = C({ raised: '1234567' }); return q.weekly === q.needUnit; })(), true);
eq('countWeekly tiny', C({ price: '999999999' }).countWeekly < 0.1, true);
console.log(`pass ${pass} / fail ${fail}`); process.exit(fail ? 1 : 0);
