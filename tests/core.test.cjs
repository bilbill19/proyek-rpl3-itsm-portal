const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
// Execute the actual TypeScript source, without persisting generated test copies.
require.extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
}).outputText, filename);
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) {
  return originalResolve.call(this, name.startsWith('@/') ? path.join(__dirname, '../src', name.slice(2)) : name, ...args);
};
const { updateServiceOrderSchema, createServiceOrderSchema } = require('../src/lib/validations/order.ts');
const { sanitizeOutboundText } = require('../src/lib/ai/egress.ts');
const { checkRateLimit } = require('../src/lib/rate-limit.ts');
const { retryTicketCreate } = require('../src/lib/order-ticket.ts');
const { normalizePhone } = require('../src/lib/whatsapp/phone.ts');

test('order accepts onsite only when a full address exists', () => {
  const input = { deviceType: 'Laptop', deviceBrand: 'Asus', problemDescription: 'Laptop tidak bisa menyala', serviceMethod: 'ONSITE' };
  assert.equal(createServiceOrderSchema.safeParse(input).success, false);
  assert.equal(createServiceOrderSchema.safeParse({ ...input, address: 'Jalan Melati 12' }).success, true);
  assert.equal(createServiceOrderSchema.safeParse({ ...input, serviceMethod: 'DROP_OFF' }).success, true);
});
test('prices accept zero and numeric UI strings', () => {
  assert.equal(updateServiceOrderSchema.parse({ finalPrice: '125000.50' }).finalPrice, 125000.5);
  assert.equal(updateServiceOrderSchema.parse({ finalPrice: 0 }).finalPrice, 0);
});
for (const value of [-1, Infinity, NaN, 'abc', '  ', '1.001', 10000000000, {}, true]) {
  test(`reject invalid price ${String(value)}`, () => assert.equal(updateServiceOrderSchema.safeParse({ finalPrice: value }).success, false));
}
test('reject arbitrary status, non-string note, empty and unexpected updates', () => {
  for (const input of [{status:'DELETED'}, {note:8}, {}, {customerId:'other'}, {note:'x'.repeat(2001)}])
    assert.equal(updateServiceOrderSchema.safeParse(input).success, false);
});
test('valid status accepted', () => assert.equal(updateServiceOrderSchema.parse({status:'IN_PROGRESS'}).status, 'IN_PROGRESS'));
test('outbound sanitizer removes supported secrets and PII', () => {
  const result = sanitizeOutboundText('Laptop email demo@example.com hp 081234567890 nvapi-1234567890 token=abcdefgh');
  for (const secret of ['demo@example.com','081234567890','nvapi-1234567890','abcdefgh']) assert.equal(result.includes(secret), false);
  assert.match(result, /Laptop/);
});
test('rate limit isolates users and resets at expiration', () => {
  const original = Date.now; let now = 100;
  Date.now = () => now;
  try {
    assert.equal(checkRateLimit('test-a',2,100),true);
    assert.equal(checkRateLimit('test-a',2,100),true);
    assert.equal(checkRateLimit('test-a',2,100),false);
    assert.equal(checkRateLimit('test-b',2,100),true);
    now=200; assert.equal(checkRateLimit('test-a',2,100),true);
  } finally { Date.now=original; }
});
test('phone handles local, international and invalid forms', () => {
  for (const value of ['081234567890','+62 812-3456-7890','006281234567890']) assert.equal(normalizePhone(value),'6281234567890');
  assert.equal(normalizePhone('123'),null);
});
test('ticket collision retries unique index and returns next number', async () => {
  const seen=[];
  const result=await retryTicketCreate('SRV-2026-0001',1,2026,async candidate=>{
    seen.push(candidate); if(seen.length<3) throw {code:'P2002',meta:{target:['ticketNumber']}}; return candidate;
  });
  assert.equal(result,'SRV-2026-0003'); assert.equal(seen.length,3);
});
test('ticket does not retry unrelated failures and is bounded',async()=>{
  let count=0;
  await assert.rejects(retryTicketCreate('a',1,2026,async()=>{count++;throw new Error('DB unavailable')}));
  assert.equal(count,1); count=0;
  await assert.rejects(retryTicketCreate('a',1,2026,async()=>{count++;throw {code:'P2002',meta:{target:['ticketNumber']}}}));
  assert.equal(count,8);
});

// Handler-level regression tests: Prisma/session/outbox are explicit doubles.
let session=null;
const order={id:'o1',customerId:'c1',ticketNumber:'SRV-2026-0001',status:'CREATED',
  service:null,customer:{id:'c1',name:'Demo',email:'demo@example.test',phone:null,password:'must-not-leak'},
  statusHistory:[{status:'CREATED',note:'Private address and phone',createdAt:new Date()}]};
let histories=0, updated=0;
const prisma={serviceOrder:{findUnique:async args=>{
  const result={...order};
  if(args.include?.customer?.select) result.customer=Object.fromEntries(Object.keys(args.include.customer.select).map(k=>[k,order.customer[k]]));
  return result;
},findFirst:async()=>order,update:async args=>{updated++;return {...order,...args.data}}},
serviceOrderStatusHistory:{create:async()=>{histories++}}, notificationOutbox:{create:async()=>({})}};
prisma.$transaction=async fn=>fn(prisma);
const load=Module._load;
Module._load=function(name,...args){
  if(name==='@/lib/prisma') return {__esModule:true,default:prisma};
  if(name==='@/lib/auth') return {getSession:async()=>session};
  if(name==='@/lib/notifications/service') return {upsertOrderStatusNotification:async()=>{}};
  if(name==='@/lib/whatsapp/dispatcher') return {kickWhatsappOutbox:()=>{},processOutbox:async()=>{}};
  if(name==='@/lib/whatsapp/env') return {getWhatsappConfig:()=>({enabled:false})};
  return load.call(this,name,...args);
};
const detail=require('../src/app/api/orders/[id]/route.ts');
const track=require('../src/app/api/track/route.ts');
const req=body=>new Request('http://localhost/api/orders/o1',{method:'PATCH',body:JSON.stringify(body)});
test('unauthenticated and cross-customer detail access denied',async()=>{
  session=null; assert.equal((await detail.GET(req({}),{params:{id:'o1'}})).status,401);
  session={id:'other',role:'CUSTOMER'}; assert.equal((await detail.GET(req({}),{params:{id:'o1'}})).status,403);
});
test('customer cannot update status',async()=>{
  session={id:'c1',role:'CUSTOMER'}; assert.equal((await detail.PATCH(req({status:'COMPLETED'}),{params:{id:'o1'}})).status,403);
});
test('invalid admin update returns 400 without write',async()=>{
  session={id:'a1',name:'Admin',role:'ADMIN'};updated=0;
  assert.equal((await detail.PATCH(req({finalPrice:-1}),{params:{id:'o1'}})).status,400);assert.equal(updated,0);
});
test('price-only update creates no false history and returns no password',async()=>{
  session={id:'a1',name:'Admin',role:'ADMIN'};histories=0;
  const response=await detail.PATCH(req({finalPrice:100}),{params:{id:'o1'}});
  assert.equal(response.status,200);assert.equal(histories,0);
  const body=await response.json();assert.equal('password' in body.order.customer,false);
});
test('public tracking suppresses private notes',async()=>{
  const response=await track.GET(new Request('http://localhost/api/track?ticket=SRV-2026-0001'));
  const body=await response.json();assert.equal(response.status,200);assert.equal(body.order.statusHistory[0].note,null);
  assert.equal(JSON.stringify(body).includes('Private address'),false);
});
test('email recovery returns 503 without a token or false delivery claim',async()=>{
  const forgot=require('../src/app/api/auth/forgot-password/route.ts');
  const response=await forgot.POST(new Request('http://localhost/api/auth/forgot-password',{
    method:'POST',body:JSON.stringify({email:'demo@example.test'})}));
  assert.equal(response.status,503);const body=await response.json();assert.equal('resetLink' in body,false);
});
test('NVIDIA adapter sends sanitized content and handles provider errors',async()=>{
  const { NvidiaNimProvider }=require('../src/lib/ai/nvidia.ts');
  const oldFetch=global.fetch,oldKey=process.env.NVIDIA_API_KEY,oldAlias=process.env.NVIDIA_KEY_ID;
  process.env.NVIDIA_API_KEY='nvapi-test-key-not-real';delete process.env.NVIDIA_KEY_ID;
  try{
    let sent;
    global.fetch=async(url,options)=>{sent=JSON.parse(options.body);return new Response(JSON.stringify({choices:[{message:{content:'Periksa adaptor daya.'}}]}));};
    const provider=new NvidiaNimProvider('IT support');
    assert.equal((await provider.generateResponse([{role:'USER',content:'Laptop demo@example.com 081234567890'}],'Laptop demo@example.com 081234567890')).reply,'Periksa adaptor daya.');
    assert.equal(JSON.stringify(sent).includes('demo@example.com'),false);
    global.fetch=async()=>new Response('nvapi-test-key-not-real',{status:401});
    await assert.rejects(provider.generateResponse([],'Laptop mati'),e=>!e.message.includes('nvapi-test-key-not-real'));
    global.fetch=async()=>new Response(JSON.stringify({choices:[]}));
    await assert.rejects(provider.generateResponse([],'Laptop mati'),/kosong/);
    delete process.env.NVIDIA_API_KEY;await assert.rejects(provider.generateResponse([],'Laptop mati'),/belum dikonfigurasi/);
  }finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.NVIDIA_API_KEY;else process.env.NVIDIA_API_KEY=oldKey;if(oldAlias!==undefined)process.env.NVIDIA_KEY_ID=oldAlias;}
});
