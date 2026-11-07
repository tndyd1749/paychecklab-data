# Paycheck Lab tax data

Public tax-rule data used by the calculators at https://paychecklab.blogspot.com/.

- `tax-data.json` holds federal brackets, standard deductions, the Social Security wage base, Medicare thresholds and the 401(k) limit for each tax year. Every item has a status: `official` (published by the IRS or SSA) or `carried` (not published yet, last year's figure is reused).
- The website reads this file when a page loads. If the file cannot be read or fails validation, the calculators keep using the figures built into the site.
- `validate.js` is the safety check. It applies the same rules as the website and rejects changes that look implausible compared with the previous year. Run `node validate.js` before every change to `tax-data.json`.

These figures are for estimates only and are not tax advice.
