import { Torrent, hasDatabaseConnection } from '../database/models.js';

export { Torrent };

/** Busca torrent por infoHash. Retorna null silenciosamente se não há banco. */
export function getTorrent(infoHash: string) {
  if (!hasDatabaseConnection) return Promise.resolve(null);
  return Torrent.findOne({ where: { infoHash } });
}

/** Cria torrent no banco. No-op silencioso se não há banco. */
export async function createTorrent(torrentData: any) {
  if (!hasDatabaseConnection) return null;
  return Torrent.create(torrentData);
}

/** Upsert de torrent. No-op silencioso se não há banco. */
export async function upsertTorrent(infoHash: string, data: any) {
  if (!hasDatabaseConnection) return null;
  const [torrent] = await Torrent.upsert({ infoHash, ...data });
  return torrent;
}

export async function syncDatabase() {
  if (!hasDatabaseConnection) return;
  await Torrent.sync();
  console.log('Banco de dados sincronizado!');
}
