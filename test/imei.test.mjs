import { test } from 'node:test';
import assert from 'node:assert/strict';
import { luhnCheckDigit, isValidLuhn, parseImei, formatImei, findImei, reportingBody } from '../src/imei.js';

test('Luhn check digit matches known IMEIs', () => {
  assert.equal(luhnCheckDigit('49015420323751'), 8);
  assert.equal(luhnCheckDigit('35693803564380'), 9);
  assert.equal(luhnCheckDigit('35389310122401'), 3);
  assert.ok(isValidLuhn('490154203237518'));
  assert.ok(!isValidLuhn('490154203237519'));
});

test('parseImei accepts 15 digits with spaces and dashes', () => {
  for (const input of ['490154203237518', '49-015420-323751-8', ' 4901 5420 3237 518 ', '49015420-323751 8']) {
    const r = parseImei(input);
    assert.ok(r.ok, input);
    assert.equal(r.imei, '490154203237518');
    assert.equal(r.tac, '49015420');
    assert.equal(r.serial, '323751');
    assert.equal(r.checkDigit, '8');
    assert.equal(r.calculated, false);
  }
});

test('parseImei computes the check digit for 14 digits', () => {
  const r = parseImei('49015420323751');
  assert.ok(r.ok);
  assert.equal(r.imei, '490154203237518');
  assert.equal(r.calculated, true);
});

test('parseImei keeps leading zeros in the TAC', () => {
  const r = parseImei('01243000123456');
  assert.ok(r.ok);
  assert.equal(r.tac, '01243000');
  assert.equal(r.imei, '012430001234561');
});

test('parseImei reports a wrong check digit with the expected one', () => {
  const r = parseImei('490154203237519');
  assert.equal(r.ok, false);
  assert.equal(r.code, 'luhn');
  assert.match(r.error, /should be 8, not 9/);
});

test('parseImei rejects bad lengths and characters', () => {
  assert.equal(parseImei('').code, 'empty');
  assert.equal(parseImei('   ').code, 'empty');
  assert.equal(parseImei('1234567890123').code, 'short');
  assert.equal(parseImei('4901542032375180').code, 'long');
  assert.match(parseImei('4901542032375181').error, /IMEISV/);
  assert.equal(parseImei('49015420323751A').code, 'chars');
  assert.equal(parseImei('4901.5420.3237.518').code, 'chars');
});

test('formatImei groups a 15-digit IMEI', () => {
  assert.equal(formatImei('490154203237518'), '49-015420-323751-8');
  assert.equal(formatImei('123'), '123');
});

test('findImei picks the valid IMEI out of selected text', () => {
  assert.equal(findImei('My phone IMEI: 490154203237518 thanks'), '490154203237518');
  assert.equal(findImei('IMEI 49-015420-323751-8.'), '490154203237518');
  assert.equal(findImei('order 123456789012345, imei 356938035643809'), '356938035643809');
  assert.equal(findImei('only 14: 49015420323751'), '49015420323751');
  assert.equal(findImei('call 555 1234'), null);
  assert.equal(findImei('1234567890123456789'), null);
  assert.equal(findImei(undefined), null);
});

test('reportingBody names known allocators', () => {
  assert.match(reportingBody('35332510'), /BABT/);
  assert.match(reportingBody('01243000'), /PTCRB/);
  assert.equal(reportingBody('03000000'), 'Test IMEI');
  assert.equal(reportingBody('77000000'), null);
});
