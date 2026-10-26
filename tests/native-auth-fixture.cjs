const { createHash } = require('node:crypto');
const { loader } = require('./load-ts.cjs');
const verifier = 'v'.repeat(43);
const challenge = createHash('sha256').update(verifier).digest('base64url');
const state = 's'.repeat(43);

exports.fixture = function fixture() {
  const grants = new Map(), sessions = new Map();
  const account = { status: 'active' };
  const database = {
    user: { findUnique: async () => account },
    verificationToken: {
      create: async ({ data }) => { grants.set(data.token, data); return data; },
      findUnique: async ({ where }) => grants.get(where.token) || null,
      updateMany: async ({ where, data }) => {
        const row = grants.get(where.token);
        if (!row || row.identifier !== where.identifier || row.expires <= where.expires.gt) return { count: 0 };
        grants.set(where.token, { ...row, ...data }); return { count: 1 };
      },
      deleteMany: async ({ where }) => {
        if (where.identifier?.startsWith) {
          let count = 0;
          for (const [token, row] of grants) if (row.identifier.startsWith(where.identifier.startsWith)) { grants.delete(token); count++; }
          return { count };
        }
        const row = grants.get(where.token);
        if (!row || row.expires <= where.expires.gt) return { count: 0 };
        grants.delete(where.token); return { count: 1 };
      },
    },
    session: {
      create: async ({ data }) => { sessions.set(data.sessionToken, data); return data; },
      findUnique: async ({ where }) => sessions.get(where.sessionToken) || null,
      deleteMany: async ({ where }) => {
        if (typeof where.sessionToken === 'string') return { count: Number(sessions.delete(where.sessionToken)) };
        let count = 0;
        for (const key of sessions.keys()) if (key.startsWith(where.sessionToken.startsWith)) { sessions.delete(key); count++; }
        return { count };
      },
    },
    $transaction: async callback => callback(database),
  };
  const load = loader({ '@/lib/db': { prisma: database } });
  const service = load('src/lib/native-auth.ts');
  async function grant() {
    const callback = new URL(await service.createNativeAuthorization('existing-user', { challenge, state }));
    return callback.searchParams.get('code');
  }
  return { load, service, grants, sessions, account, grant,
    login: async () => service.exchangeNativeAuthorization({ code: await grant(), verifier }) };
};
