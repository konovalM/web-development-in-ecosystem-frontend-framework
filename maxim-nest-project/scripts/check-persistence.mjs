import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test')) {
  throw new Error(
    'TEST_DATABASE_URL must name a dedicated *_test database with migrations and seed',
  );
}
// Two sequential, independent Nest processes. No working-database mutation.
const program = `
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './dist/app.module.js';
process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
process.env.NODE_ENV='test';process.env.DEMO_AUTH='true';
const app=await NestFactory.create(AppModule,{logger:false});
app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
try {
 await app.listen(0,'127.0.0.1');
 const base=await app.getUrl();const create=process.env.VIDNEST_PERSISTENCE_ACTION==='create';
 const res=await fetch(base+'/videos'+(create?'':'/'+process.env.VIDNEST_PERSISTENCE_ID),{
  method:create?'POST':'GET',headers:{'Content-Type':'application/json','X-Demo-User':'1'},
  ...(create?{body:JSON.stringify({channelId:1,title:'Persistence between processes',sizeBytes:'1234',tagIds:[1]})}:{})
 });
 assert.equal(res.status,create?201:200);const video=await res.json();
 console.log(JSON.stringify({action:create?'create':'read',pid:process.pid,httpStatus:res.status,id:video.id,sizeBytes:video.sizeBytes,status:video.status}));
} finally {await app.close();}
`;
function run(action, id = '') {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', program],
    {
      cwd: fileURLToPath(new URL('../', import.meta.url)),
      env: {
        ...process.env,
        VIDNEST_PERSISTENCE_ACTION: action,
        VIDNEST_PERSISTENCE_ID: String(id),
      },
      encoding: 'utf8',
      timeout: 30000,
    },
  );
  assert.equal(
    result.status,
    0,
    result.stderr || result.stdout || String(result.error),
  );
  return JSON.parse(result.stdout.trim());
}
const created = run('create');
const read = run('read', created.id);
assert.notEqual(created.pid, read.pid);
assert.equal(created.id, read.id);
assert.equal(read.sizeBytes, '1234');
assert.equal(read.status, 'draft');
const evidence = {
  database: new URL(url).pathname.slice(1),
  created,
  read,
  passed: true,
};
await writeFile(
  new URL(
    '../../docs/lab3/evidence/persistence-processes.json',
    import.meta.url,
  ),
  JSON.stringify(evidence, null, 2),
);
console.log(JSON.stringify(evidence, null, 2));
