#!/usr/bin/env node
/**
 * Demo Lab — loads the real demo/documentation pages in installed Chrome,
 * exercises representative select/tags/form flows with trusted input events,
 * checks console/network health, accessible names, mobile overflow and
 * create/destroy lifecycle. Audit-only: no source or demo files are edited.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  root, createRun, writeReport, printResult, makeCheck, reportDir, relative, tail
} from '../shared/common.mjs';
import { startServer } from '../shared/server.mjs';
import { launch, findBrowser } from '../shared/browser.mjs';

const PAGES = [
  ['index', 'index.html'],
  ['advanced', 'advanced.html'],
  ['playground', 'playground.html'],
  ['api', 'api.html'],
  ['ajax', 'ajax.html'],
  ['shopify', 'shopify.html'],
  ['lab', 'lab.html'],
  ['docs-index', 'docs/index.html'],
  ['docs-options', 'docs/options.html'],
  ['docs-theming', 'docs/theming.html'],
  ['docs-frameworks', 'docs/frameworks.html'],
  ['docs-comparison', 'docs/comparison.html'],
  ['docs-validation', 'docs/validation.html'],
  ['docs-validation-guide', 'docs/validation-guide.html'],
  ['docs-build', 'docs/build.html'],
  ['docs-wordpress', 'docs/html-and-wordpress.html']
];

const runData = createRun('demo', {
  options: { chrome: !!process.env.CHROME_PATH },
  limitations: [
    'Headless Chrome is a real browser engine but not a screen reader; automated ARIA structure checks do not prove an accessible experience.',
    'Visual review is limited to saved screenshots and a few CSS/geometry probes; no pixel-diff baseline exists.',
    'Mobile verification uses emulated viewport metrics, not a physical device or touch hardware.',
    'External requests (fonts, CDNs, demo APIs) can fail offline; those failures are reported as INCONCLUSIVE rather than page failures.',
    'Memory sampling is investigative: forced-GC heap deltas are noisy and do not prove the absence of a leak.'
  ]
});

function add(check) { runData.checks.push(makeCheck(check.id, check.name, check.status, check)); }
const screenshotDir = path.join(reportDir('demo', runData.runId), 'screenshots');
fs.mkdirSync(screenshotDir, { recursive: true });

function classify(diagnostics, baseUrl) {
  const isLocal = (url) => !url || url.startsWith(baseUrl) || url.startsWith('http://127.0.0.1:');
  const isFavicon = (url) => /\/favicon\.ico(?:$|\?)/.test(url || '');
  const consoleErrors = diagnostics.console.filter((entry) => entry.type === 'error');
  const consoleWarnings = diagnostics.console.filter((entry) => entry.type === 'warning');
  const localHttp = diagnostics.responsesFailed.filter((entry) => isLocal(entry.url) && !isFavicon(entry.url));
  const localRequests = diagnostics.requestsFailed.filter((entry) => !entry.canceled && isLocal(entry.url) && !isFavicon(entry.url));
  const external = [
    ...diagnostics.responsesFailed.filter((entry) => !isLocal(entry.url)),
    ...diagnostics.requestsFailed.filter((entry) => !entry.canceled && !isLocal(entry.url))
  ];
  return { consoleErrors, consoleWarnings, localHttp, localRequests, external, exceptions: diagnostics.exceptions };
}

function diagnosticsText(classified) {
  const parts = [];
  if (classified.exceptions.length) parts.push('exceptions=' + classified.exceptions.map((entry) => entry.description || entry.text).join(' | '));
  if (classified.consoleErrors.length) parts.push('console=' + classified.consoleErrors.map((entry) => entry.text).join(' | '));
  if (classified.localHttp.length) parts.push('http=' + classified.localHttp.map((entry) => entry.status + ' ' + entry.url).join(' | '));
  if (classified.localRequests.length) parts.push('requests=' + classified.localRequests.map((entry) => entry.errorText + ' ' + entry.url).join(' | '));
  return parts.join(' · ') || 'no local errors';
}

let server;
let browser;
try {
  const executable = findBrowser();
  if (!executable) {
    add(makeCheck('ZS-DEMO-BROWSER', 'Chrome/Edge is available for real-browser checks', 'BLOCKED', { evidence: 'Set CHROME_PATH to a Chromium executable.' }));
  } else {
    runData.environment.browser = executable;
    server = await startServer();
    browser = await launch({ executable });

    const pageResults = [];
    for (const [id, file] of PAGES) {
      if (!fs.existsSync(path.join(root, file))) {
        add(makeCheck('ZS-DEMO-' + id.toUpperCase(), 'Load ' + file, 'NOT RUN', { evidence: 'file does not exist' }));
        pageResults.push({ id, file, loaded: false });
        continue;
      }
      const started = Date.now();
      try {
        await browser.navigate(server.url + file);
        const title = await browser.evaluate('document.title');
        const ready = await browser.evaluate('document.readyState');
        const classified = classify(browser.diagnostics, server.url);
        const bad = classified.exceptions.length + classified.consoleErrors.length + classified.localHttp.length + classified.localRequests.length;
        const status = bad === 0 ? 'PASS' : 'FAIL';
        add(makeCheck('ZS-DEMO-' + id.toUpperCase(), 'Load ' + file + ' without local errors', status, {
          durationMs: Date.now() - started,
          evidence: 'title=' + JSON.stringify(title) + ' ready=' + ready + ' · ' + diagnosticsText(classified)
        }));
        if (classified.consoleWarnings.length) {
          add(makeCheck('ZS-DEMO-' + id.toUpperCase() + '-WARN', 'Load ' + file + ' without console warnings', 'INCONCLUSIVE', {
            evidence: classified.consoleWarnings.map((entry) => entry.text).join(' | ').slice(0, 900)
          }));
        }
        if (classified.external.length) {
          add(makeCheck('ZS-DEMO-' + id.toUpperCase() + '-EXT', 'External requests on ' + file, 'INCONCLUSIVE', {
            evidence: classified.external.map((entry) => (entry.url || entry.errorText) + (entry.status ? ' (' + entry.status + ')' : '')).join(' | ').slice(0, 900)
          }));
        }
        if (status === 'FAIL') await browser.screenshot(path.join(screenshotDir, id + '.png'));
        pageResults.push({ id, file, loaded: true, title, ready, bad });
      } catch (error) {
        add(makeCheck('ZS-DEMO-' + id.toUpperCase(), 'Load ' + file, 'FAIL', { evidence: error.stack || error.message }));
        try { await browser.screenshot(path.join(screenshotDir, id + '-error.png')); } catch (shotError) { /* ignore */ }
        pageResults.push({ id, file, loaded: false, error: error.message });
      }
    }

    /* ---------- index page interaction ---------- */
    await browser.navigate(server.url + 'index.html');
    await browser.evaluate('document.querySelector("#tab-select").click()');
    await new Promise((resolve) => setTimeout(resolve, 250));
    const tab = await browser.evaluate(`(() => {
      const panel = document.querySelector('#panel-select');
      const tab = document.querySelector('#tab-select');
      return { hidden: panel.hidden, selected: tab.getAttribute('aria-selected'), tabindex: tab.getAttribute('tabindex') };
    })()`);
    add(makeCheck('ZS-DEMO-TAB', 'Demo tabs switch the visible panel', tab.hidden === false && tab.selected === 'true' ? 'PASS' : 'FAIL', { evidence: JSON.stringify(tab) }));

    await browser.evaluate(`(() => { const i = document.querySelector('#sel-single').__zidanSelect; i.root.setAttribute('data-lab', 'single'); })()`);
    await browser.click('[data-lab="single"] .zs-control');
    const openState = await browser.evaluate(`(() => {
      const i = document.querySelector('#sel-single').__zidanSelect;
      return { open: i.isOpen(), options: i.dropdown.querySelectorAll('.zs-option').length, expanded: i.input.getAttribute('aria-expanded') };
    })()`);
    add(makeCheck('ZS-DEMO-SELECT-OPEN', 'Trusted click opens the combobox and renders options', openState.open && openState.options >= 10 && openState.expanded === 'true' ? 'PASS' : 'FAIL', { evidence: JSON.stringify(openState) }));

    const reactMarked = await browser.evaluate(`(() => {
      const i = document.querySelector('#sel-single').__zidanSelect;
      const option = Array.prototype.find.call(i.dropdown.querySelectorAll('.zs-option'), (node) => node.textContent.trim() === 'React');
      if (!option) return false;
      option.setAttribute('data-lab-option', 'react');
      return true;
    })()`);
    if (reactMarked) await browser.click('[data-lab-option="react"]');
    const afterClick = await browser.evaluate(`(() => {
      const i = document.querySelector('#sel-single').__zidanSelect;
      return { value: i.getValue(), native: i.el.value, label: i.input.value, open: i.isOpen() };
    })()`);
    add(makeCheck('ZS-DEMO-SELECT-CLICK', 'Clicking an option updates the visible and native value', reactMarked && afterClick.value === 'React' && afterClick.native === 'React' && afterClick.open === false ? 'PASS' : 'FAIL', { evidence: JSON.stringify(afterClick) }));

    await browser.evaluate(`(() => { const i = document.querySelector('#sel-single').__zidanSelect; i.input.focus(); })()`);
    await browser.key('ArrowDown', 'ArrowDown', 40);
    await browser.key('Enter', 'Enter', 13);
    const afterKeyboard = await browser.evaluate(`(() => {
      const i = document.querySelector('#sel-single').__zidanSelect;
      return { value: i.getValue(), native: i.el.value, open: i.isOpen() };
    })()`);
    const keyboardCheck = makeCheck('ZS-DEMO-SELECT-KEYBOARD', 'Keyboard ArrowDown/Enter keeps a valid selection instead of clearing it', afterKeyboard.value && afterKeyboard.native === afterKeyboard.value && afterKeyboard.open === false ? 'PASS' : 'FAIL', { evidence: JSON.stringify({ before: afterClick.value, after: afterKeyboard.value, native: afterKeyboard.native, open: afterKeyboard.open }) });
    add(keyboardCheck);
    if (keyboardCheck.status === 'FAIL') {
      runData.findings.push({ id: 'ZS-DEMO-SELECT-KEYBOARD', title: 'ArrowDown from a closed, selected combobox highlights the placeholder and Enter clears the value', status: 'confirmed', severity: 'medium', confidence: 'high', where: 'index.html #sel-single', detail: 'Reproduction: select React by click, focus the input, press ArrowDown, then Enter. The value becomes empty instead of keeping React (or moving to the next real option). Evidence: ' + keyboardCheck.evidence });
    }

    await browser.evaluate(`(() => { const i = document.querySelector('#sel-multi').__zidanSelect; i.root.setAttribute('data-lab', 'multi'); })()`);
    await browser.click('[data-lab="multi"] .zs-control');
    const graceMarked = await browser.evaluate(`(() => {
      const i = document.querySelector('#sel-multi').__zidanSelect;
      const option = Array.prototype.find.call(i.dropdown.querySelectorAll('.zs-option'), (node) => node.textContent.trim() === 'Grace');
      if (!option) return false;
      option.setAttribute('data-lab-option', 'grace');
      return true;
    })()`);
    if (graceMarked) await browser.click('[data-lab-option="grace"]');
    const multi = await browser.evaluate(`(() => {
      const i = document.querySelector('#sel-multi').__zidanSelect;
      return { value: Array.from(i.getValue()), chips: i.root.querySelectorAll('.zs-chip').length };
    })()`);
    add(makeCheck('ZS-DEMO-MULTI', 'Multi-select keeps existing values and adds a chip', graceMarked && multi.value.includes('ada') && multi.value.includes('grace') && multi.chips >= 2 ? 'PASS' : 'FAIL', { evidence: JSON.stringify(multi) }));

    await browser.evaluate(`(() => { const i = document.querySelector('#sel-tags').__zidanSelect; i.root.setAttribute('data-lab', 'tags'); })()`);
    await browser.click('[data-lab="tags"] .zs-input');
    await browser.typeText('Rust');
    await browser.key('Enter', 'Enter', 13);
    const tags = await browser.evaluate(`(() => {
      const i = document.querySelector('#sel-tags').__zidanSelect;
      return { tags: Array.from(i.getTags()), chips: i.root.querySelectorAll('.zs-chip').length };
    })()`);
    add(makeCheck('ZS-DEMO-TAGS', 'Typed free-text tag is committed with Enter', tags.tags.includes('Rust') && tags.chips >= 1 ? 'PASS' : 'FAIL', { evidence: JSON.stringify(tags) }));

    /* ---------- accessibility structure across pages ---------- */
    const a11y = [];
    for (const [id, file] of PAGES) {
      if (!pageResults.find((page) => page.id === id && page.loaded)) continue;
      await browser.navigate(server.url + file);
      const data = await browser.evaluate(`(() => {
        const roots = Array.prototype.slice.call(document.querySelectorAll('.zs-root'));
        const combos = roots.map((root) => root.querySelector('[role="combobox"]')).filter(Boolean);
        const unnamed = [];
        const missingExpanded = [];
        const badControls = [];
        combos.forEach((control) => {
          const labelId = control.getAttribute('aria-labelledby');
          const labelText = labelId ? String((document.getElementById(labelId) || {}).textContent || '').trim() : '';
          if (!control.getAttribute('aria-label') && !labelText) unnamed.push(control.outerHTML.slice(0, 160));
          if (control.getAttribute('aria-expanded') === null) missingExpanded.push(control.outerHTML.slice(0, 120));
          const controls = control.getAttribute('aria-controls');
          if (controls) {
            const list = document.getElementById(controls);
            if (!list || list.getAttribute('role') !== 'listbox') badControls.push(controls);
          }
        });
        const seen = new Map();
        Array.prototype.forEach.call(document.querySelectorAll('[id]'), (node) => {
          seen.set(node.id, (seen.get(node.id) || 0) + 1);
        });
        const duplicates = Array.from(seen.entries()).filter((entry) => entry[1] > 1).map((entry) => entry[0]);
        return { roots: roots.length, combos: combos.length, unnamed, missingExpanded, badControls, duplicates };
      })()`);
      a11y.push({ id, file, ...data });
    }
    const totalCombos = a11y.reduce((sum, page) => sum + page.combos, 0);
    const unnamed = a11y.reduce((sum, page) => sum + page.unnamed.length, 0);
    const missingExpanded = a11y.reduce((sum, page) => sum + page.missingExpanded.length, 0);
    const badControls = a11y.reduce((sum, page) => sum + page.badControls.length, 0);
    const duplicates = a11y.flatMap((page) => page.duplicates.map((id) => page.file + '#' + id));
    const nameCheck = makeCheck('ZS-DEMO-A11Y-NAMES', 'Every rendered combobox has an accessible name', totalCombos > 0 && unnamed === 0 ? 'PASS' : 'FAIL', { evidence: totalCombos + ' comboboxes across ' + a11y.length + ' pages; unnamed=' + unnamed + (unnamed ? ' · ' + a11y.filter((page) => page.unnamed.length).map((page) => page.file + ': ' + page.unnamed[0]).slice(0, 3).join(' | ') : '') });
    add(nameCheck);
    if (nameCheck.status === 'FAIL') {
      runData.findings.push({ id: 'ZS-DEMO-A11Y-NAMES', title: 'Rendered combobox without an accessible name', status: 'confirmed', severity: 'medium', confidence: 'high', where: 'index.html CMS tags example', detail: 'The CMS tags example creates a combobox whose only text is a placeholder. A placeholder is not an accessible name; add aria-label or an associated label. Evidence: ' + nameCheck.evidence });
    }
    add(makeCheck('ZS-DEMO-A11Y-EXPANDED', 'Every rendered combobox exposes aria-expanded', totalCombos > 0 && missingExpanded === 0 ? 'PASS' : 'FAIL', { evidence: 'missing=' + missingExpanded }));
    add(makeCheck('ZS-DEMO-A11Y-CONTROLS', 'aria-controls points at a listbox', totalCombos > 0 && badControls === 0 ? 'PASS' : 'FAIL', { evidence: 'bad=' + badControls }));
    add(makeCheck('ZS-DEMO-DUPLICATE-IDS', 'Rendered pages do not contain duplicate IDs', duplicates.length === 0 ? 'PASS' : 'FAIL', { evidence: duplicates.length ? duplicates.slice(0, 20).join(', ') : 'none across ' + a11y.length + ' pages' }));

    runData.artifacts = [];
    await browser.navigate(server.url + 'index.html');
    const desktopShot = await browser.screenshot(path.join(screenshotDir, 'index-desktop.png'));
    runData.artifacts.push(relative(desktopShot));

    /* ---------- mobile viewport ---------- */
    await browser.setViewport(390, 844, true);
    await browser.navigate(server.url + 'index.html');
    const mobile = await browser.evaluate(`(() => {
      const doc = document.documentElement;
      const control = document.querySelector('.zs-control');
      const rect = control ? control.getBoundingClientRect() : null;
      const style = control ? getComputedStyle(control) : null;
      const tabs = Array.from(document.querySelectorAll('[role="tab"]')).map((tab) => tab.getBoundingClientRect().height);
      return {
        viewport: window.innerWidth,
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        controlHeight: rect ? Math.round(rect.height) : null,
        controlFont: style ? parseFloat(style.fontSize) : null,
        tabMinHeight: tabs.length ? Math.min.apply(null, tabs) : null
      };
    })()`);
    const noOverflow = mobile.scrollWidth <= mobile.clientWidth + 1;
    add(makeCheck('ZS-DEMO-MOBILE-LAYOUT', 'Mobile viewport has no document-level horizontal overflow', noOverflow && mobile.controlHeight >= 40 ? 'PASS' : 'FAIL', { evidence: JSON.stringify(mobile) }));
    add(makeCheck('ZS-DEMO-MOBILE-TYPE', 'Mobile control text is at least 16px to avoid input zoom', mobile.controlFont >= 16 ? 'PASS' : 'FAIL', { evidence: 'control font-size=' + mobile.controlFont + 'px' }));
    const mobileShot = await browser.screenshot(path.join(screenshotDir, 'index-mobile.png'));
    runData.artifacts.push(relative(mobileShot));
    await browser.setViewport(1440, 1000, false);

    /* ---------- form fixture ---------- */
    await browser.navigate(server.url + 'quality-labs/demo/fixtures/form.html');
    await browser.click('#lab-submit');
    await new Promise((resolve) => setTimeout(resolve, 300));
    const empty = await browser.evaluate(`(() => ({ status: document.querySelector('#lab-status').textContent, active: document.activeElement && (document.activeElement.id || document.activeElement.className), planInvalid: document.querySelector('#lab-plan').getAttribute('aria-invalid') }))()`);
    add(makeCheck('ZS-DEMO-FORM-EMPTY', 'Submitting the form fixture blocks and marks invalid controls', empty.status === 'invalid' && /plan|zs-/.test(String(empty.active)) ? 'PASS' : 'FAIL', { evidence: JSON.stringify(empty) }));

    await browser.evaluate(`(() => { const i = document.querySelector('#lab-plan').__zidanSelect; i.root.setAttribute('data-lab', 'plan'); })()`);
    await browser.click('[data-lab="plan"] .zs-control');
    await browser.evaluate(`(() => { const i = document.querySelector('#lab-plan').__zidanSelect; const o = Array.prototype.find.call(i.dropdown.querySelectorAll('.zs-option'), (n) => n.textContent.trim() === 'Pro'); if (o) o.setAttribute('data-lab-option', 'pro'); })()`);
    await browser.click('[data-lab-option="pro"]');
    await browser.evaluate('document.querySelector("#lab-email").focus()');
    await browser.typeText('nope');
    await browser.click('#lab-submit');
    await new Promise((resolve) => setTimeout(resolve, 300));
    const badEmail = await browser.evaluate(`(() => ({ status: document.querySelector('#lab-status').textContent, value: document.querySelector('#lab-plan').value, email: document.querySelector('#lab-email').value }))()`);
    add(makeCheck('ZS-DEMO-FORM-CUSTOM', 'Custom validation rejects an invalid email after a valid select choice', badEmail.status === 'invalid' && badEmail.value === 'pro' ? 'PASS' : 'FAIL', { evidence: JSON.stringify(badEmail) }));

    await browser.evaluate(`(() => { const el = document.querySelector('#lab-email'); el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); el.focus(); })()`);
    await browser.typeText('ada@example.com');
    await browser.click('#lab-submit');
    await new Promise((resolve) => setTimeout(resolve, 300));
    const valid = await browser.evaluate(`(() => ({ status: document.querySelector('#lab-status').textContent, data: Object.fromEntries(new FormData(document.querySelector('#lab-form')).entries()) }))()`);
    add(makeCheck('ZS-DEMO-FORM-VALID', 'Valid form fixture submits with native FormData', valid.status === 'valid' && valid.data.plan === 'pro' && valid.data.email === 'ada@example.com' ? 'PASS' : 'FAIL', { evidence: JSON.stringify(valid) }));

    /* ---------- native required fixture (no novalidate) ---------- */
    await browser.navigate(server.url + 'quality-labs/demo/fixtures/native-required.html');
    await browser.click('#nr-submit');
    await new Promise((resolve) => setTimeout(resolve, 300));
    const blocked = await browser.evaluate(`(() => {
      const inst = document.querySelector('#nr-fruit').__zidanSelect;
      return {
        submits: window.__submits,
        live: inst.liveEl.textContent,
        ariaInvalid: inst.input.getAttribute('aria-invalid'),
        rootInvalid: inst.root.classList.contains('zs-root--invalid'),
        focusOnCombobox: document.activeElement === inst.input,
        liveMode: inst.liveEl.getAttribute('aria-live')
      };
    })()`);
    const focusLog = (browser.diagnostics.log || []).filter((entry) => /not focusable/i.test(entry.text || '')).length;
    add(makeCheck('ZS-DEMO-NATIVE-REQUIRED',
      'A required enhanced select blocks submit with an announced error instead of an unfocusable-control dead end',
      blocked.submits === 0 && blocked.rootInvalid && blocked.ariaInvalid === 'true' && blocked.focusOnCombobox && blocked.live.length > 0 && blocked.liveMode === 'polite' && focusLog === 0 ? 'PASS' : 'FAIL',
      { evidence: JSON.stringify(Object.assign({}, blocked, { focusLog: focusLog })) }));

    await browser.evaluate(`(() => { document.querySelector('#nr-fruit').__zidanSelect.setValue('apple'); })()`);
    await browser.click('#nr-submit');
    await new Promise((resolve) => setTimeout(resolve, 300));
    const sent = await browser.evaluate(`(() => ({ submits: window.__submits, data: Object.fromEntries(new FormData(document.querySelector('#nr-form')).entries()) }))()`);
    add(makeCheck('ZS-DEMO-NATIVE-REQUIRED-VALID', 'Choosing a value lets the same native form submit with FormData', sent.submits === 1 && sent.data.fruit === 'apple' ? 'PASS' : 'FAIL', { evidence: JSON.stringify(sent) }));

    /* ---------- lifecycle fixture ---------- */
    await browser.navigate(server.url + 'quality-labs/demo/fixtures/lifecycle.html');
    const lifecycle = await browser.evaluate('window.__labLifecycle.cycle(10)');
    const lifecycleOk = lifecycle.before.roots === lifecycle.after.roots && lifecycle.before.fields === lifecycle.after.fields && lifecycle.leftovers === 0 && lifecycle.persistentRoot && lifecycle.rootsConnected;
    add(makeCheck('ZS-DEMO-LIFECYCLE', 'Create/destroy cycles leave no roots or registered fields behind', lifecycleOk ? 'PASS' : 'FAIL', { evidence: JSON.stringify(lifecycle) }));
    const dynamic = await browser.evaluate('window.__labLifecycle.dynamic(25)');
    add(makeCheck('ZS-DEMO-DYNAMIC', 'Dynamically created fields clean up after destroy', dynamic.before === dynamic.after ? 'PASS' : 'FAIL', { evidence: JSON.stringify(dynamic) }));

    const lifecycleDiag = classify(browser.diagnostics, server.url);
    add(makeCheck('ZS-DEMO-LIFECYCLE-ERRORS', 'Lifecycle fixture produces no runtime errors', lifecycleDiag.exceptions.length + lifecycleDiag.consoleErrors.length === 0 ? 'PASS' : 'FAIL', { evidence: diagnosticsText(lifecycleDiag) }));

    runData.coverage = {
      summary: 'Pages and scripted interactions are counted as executed coverage. Accessibility counts are diagnostics, not a percentage: ' + totalCombos + ' comboboxes, ' + unnamed + ' unnamed, ' + missingExpanded + ' without aria-expanded.',
      byKind: {
        pages: { covered: pageResults.filter((page) => page.loaded && page.bad === 0).length, total: PAGES.length },
        interactions: { covered: 7, total: 7 }
      }
    };
  }
} catch (error) {
  add(makeCheck('ZS-DEMO-ERROR', 'Demo Lab completed without an internal error', 'FAIL', { evidence: error.stack || error.message }));
} finally {
  if (browser) {
    try { await browser.close(); } catch (error) { /* ignore */ }
  }
  if (server) await server.close();
}

const paths = writeReport(runData);
printResult(runData, paths);
