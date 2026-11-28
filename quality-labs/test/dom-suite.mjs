#!/usr/bin/env node
/** Runs the existing jsdom suite and prints a machine-readable summary line. */
import { runDomTests } from '../../scripts/dom/run.mjs';
const result = await runDomTests();
console.log('#ZS-DOM-SUMMARY#' + JSON.stringify(result));
if (result.failures) process.exitCode = 1;
