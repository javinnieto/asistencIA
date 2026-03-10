const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNjk1MTYzNDMyLCJpYXQiOjE2OTUxNjE2MzIsImp0aSI6Ijg1ZGNjZWM5ZDEzMTRkOGFhMzZlNzljYmFkMjJmMDQwIiwidXNlcl9pZCI6MSwidXNlcm5hbWUiOiJqYXZpbm5pZXRvIiwiaXNfc3RhZmYiOnRydWUsImVtYWlsIjoiIn0.signature";
const payload = token.split('.')[1];
console.log(Buffer.from(payload, 'base64').toString());
try {
  console.log(atob(payload));
} catch(e) { console.log('atob error:', e.message); }
