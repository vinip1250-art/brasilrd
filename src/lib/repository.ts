import { Torrent } from '../database/models.js';

export { Torrent };

const hasDatabaseUrl = !!(
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_PUBLIC_URL
);

/** Busca torrent por infoHash. Retorna null silenciosamente se não há banco. */
export function getTorrent(infoHash: string) {
  if (!hasDatabaseUrl) return Promise.resolve(null);
  return Torrent.findOne({ where: { infoHash } });
}

/** Cria torrent no banco. No-op silencioso se não há banco. */
export async function createTorrent(torrentData: any) {
  if (!hasDatabaseUrl) return null;
  return Torrent.create(torrentData);
}

/** Upsert de torrent. No-op silencioso se não há banco. */
export async function upsertTorrent(infoHash: string, data: any) {
  if (!hasDatabaseUrl) return null;
  const [torrent] = await Torrent.upsert({ infoHash, ...data });
  return torrent;
}

export async function syncDatabase() {
  if (!hasDatabaseUrl) return;
  await Torrent.sync();
  console.log('Banco de dados sincronizado!');
}
