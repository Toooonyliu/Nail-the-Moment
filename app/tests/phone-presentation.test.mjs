import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prefersPhonePresentation, hasNativeKeyboard } from '../src/phone-presentation.ts';

const desktop = { search: '', touchPoints: 0, coarsePointer: false, screenWidth: 1440, screenHeight: 900 };
test('phone URL fills the screen, while desktop keeps the calibrated preview', () => {
  assert.equal(prefersPhonePresentation(desktop), false);
  assert.equal(prefersPhonePresentation({ ...desktop, search: '?phone=1&demo=1' }), true);
});
test('phones use native presentation in either orientation and can opt back into the frame', () => {
  const phone = { ...desktop, touchPoints: 5, coarsePointer: true, screenWidth: 402, screenHeight: 874 };
  assert.equal(prefersPhonePresentation(phone), true);
  assert.equal(prefersPhonePresentation({ ...phone, screenWidth: 874, screenHeight: 402 }), true);
  assert.equal(prefersPhonePresentation({ ...phone, search: '?phone=0' }), false);
  assert.equal(prefersPhonePresentation({ ...phone, screenWidth: 1024, screenHeight: 1366 }), false);
});
test('native keyboard follows viewport occlusion, not just focus or browser toolbar changes', () => {
  assert.equal(hasNativeKeyboard(874, 540, true), true);
  assert.equal(hasNativeKeyboard(874, 540, false), false);
  assert.equal(hasNativeKeyboard(874, 800, true), false);
  assert.equal(hasNativeKeyboard(874, 874, true), false);
});
