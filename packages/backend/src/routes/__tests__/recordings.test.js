const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const recordings = require('../recordings');

const uploadsDir = path.join(__dirname, '../../../uploads');

describe('POST /recordings', () => {
  let app;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(recordings);
    await fs.rm(uploadsDir, { recursive: true, force: true });
    await fs.mkdir(uploadsDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(uploadsDir, { recursive: true, force: true });
  });

  test('valid filenames are saved successfully', async () => {
    const res = await request(app)
      .post('/recordings')
      .send({ name: 'test.txt', data: 'hello' });

    expect(res.status).toBe(200);
    const content = await fs.readFile(path.join(uploadsDir, 'test.txt'), 'utf8');
    expect(content).toBe('hello');
  });

  test('filenames with path traversal are rejected', async () => {
    const res = await request(app)
      .post('/recordings')
      .send({ name: '../evil.txt', data: 'nope' });

    expect(res.status).toBe(400);
    const exists = await fs
      .access(path.join(uploadsDir, 'evil.txt'))
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);
  });
});

