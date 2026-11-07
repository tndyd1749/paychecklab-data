// Safety gate for tax-data.json. Same rules the website applies, plus sanity checks against the previous year.
// Usage: node tools/validate.js [path]   (exit code 1 on any problem)
var fs = require('fs'), path = require('path');
var file = process.argv[2] || path.join(__dirname, 'tax-data.json');
var RATES7 = [.1, .12, .22, .24, .32, .35, .37], errs = [];
function numIn(x, lo, hi) { return typeof x === 'number' && isFinite(x) && x >= lo && x <= hi; }
function bad(m) { errs.push(m); }
function validFed(f, y) {
  ['single', 'joint', 'hoh'].forEach(function (k) {
    var e = f && f[k]; if (!e || typeof e.label !== 'string' || !numIn(e.std, 5000, 200000) || !e.br || e.br.length !== 7) return bad(y + ' FED.' + k + ' shape');
    e.br.forEach(function (b, j) { if (!b || b[1] !== RATES7[j] || !numIn(b[0], 0, 5000000) || (j === 0 ? b[0] !== 0 : b[0] <= e.br[j - 1][0])) bad(y + ' FED.' + k + ' bracket ' + j); });
  });
}
function validTax(t, y) {
  if (!t || t.ssRate !== .062 || t.medRate !== .0145 || t.addMedRate !== .009 || !numIn(t.ssBase, 100000, 1000000) || !numIn(t.k401, 10000, 100000) || !t.addMedThr) return bad(y + ' TAX shape');
  ['single', 'joint', 'hoh'].forEach(function (k) { if (!numIn(t.addMedThr[k], 100000, 500000)) bad(y + ' addMedThr.' + k); });
}
var j = JSON.parse(fs.readFileSync(file, 'utf8')), prev = null;
if (!/^\d{4}-\d\d-\d\d$/.test(j.checked || '')) bad('checked date');
Object.keys(j.years).sort().forEach(function (y) {
  var d = j.years[y];
  if (!/^20\d\d$/.test(y)) bad('year key ' + y);
  validFed(d.FED, y); validTax(d.TAX, y);
  if (!/^\d{4}-\d\d-\d\d$/.test(d.effective || '')) bad(y + ' effective');
  if (!d.items || !d.items.length || d.items.some(function (i) { return typeof i.n !== 'string' || (i.st !== 'official' && i.st !== 'carried'); })) bad(y + ' items');
  if (prev && !errs.length) { // year-over-year sanity: inflation adjustments are small
    var pd = j.years[prev];
    ['single', 'joint', 'hoh'].forEach(function (k) {
      var r = d.FED[k].std / pd.FED[k].std; if (r < 1 || r > 1.08) bad(y + ' std deduction ' + k + ' changed ' + ((r - 1) * 100).toFixed(1) + '% vs ' + prev);
      d.FED[k].br.forEach(function (b, i) { var q = b[0] / (pd.FED[k].br[i][0] || 1); if (i && (q < 1 || q > 1.08)) bad(y + ' bracket ' + k + ' ' + i + ' changed ' + ((q - 1) * 100).toFixed(1) + '%'); });
    });
    var s = d.TAX.ssBase / pd.TAX.ssBase; if (s < 1 || s > 1.12) bad(y + ' ssBase changed ' + ((s - 1) * 100).toFixed(1) + '%');
    var k4 = d.TAX.k401 / pd.TAX.k401; if (k4 < 1 || k4 > 1.1) bad(y + ' k401 changed ' + ((k4 - 1) * 100).toFixed(1) + '%');
  }
  prev = y;
});
if (errs.length) { console.error('INVALID:\n- ' + errs.join('\n- ')); process.exit(1); }
console.log('OK: ' + Object.keys(j.years).join(', '));
