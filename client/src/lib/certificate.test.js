import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CERTIFICATE_MAX_BYTES, certificateProblem, certificateType, formatSize } from './certificate.js';

const file = (name, type, size = 1000) => ({ name, type, size });

test('PDF, JPEG and PNG files are accepted, by type or, when the browser gives none, by name', () => {
  assert.equal(certificateType(file('licence.pdf', 'application/pdf')), 'application/pdf');
  assert.equal(certificateType(file('scan.JPG', '')), 'image/jpeg');
  assert.equal(certificateType(file('photo.png', '')), 'image/png');
  assert.equal(certificateProblem(file('licence.pdf', 'application/pdf')), null);
});

test('other files, empty files and files over 5 MB are refused with a reason', () => {
  assert.equal(certificateType(file('notes.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')), null);
  // a browser that says what it is wins over the name
  assert.equal(certificateType(file('fake.pdf', 'text/html')), null);
  assert.match(certificateProblem(file('notes.docx', '')), /PDF, JPEG or PNG/);
  assert.match(certificateProblem(file('empty.pdf', 'application/pdf', 0)), /empty/);
  assert.match(certificateProblem(file('big.pdf', 'application/pdf', CERTIFICATE_MAX_BYTES + 1)), /5\.0 MB.*up to 5 MB/);
  assert.equal(certificateProblem(file('just-fits.pdf', 'application/pdf', CERTIFICATE_MAX_BYTES)), null);
});

test('sizes read naturally', () => {
  assert.equal(formatSize(512), '512 bytes');
  assert.equal(formatSize(300 * 1024), '300 KB');
  assert.equal(formatSize(2.5 * 1024 * 1024), '2.5 MB');
});
