import { Sequelize, DataTypes, Model } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = 
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_PUBLIC_URL;

const isVercel = !!process.env.VERCEL;

if (!DATABASE_URL && process.env.NODE_ENV === 'production') {
  console.warn('[models] DATABASE_URL não configurada. Operando sem banco de dados (modo somente-leitura).');
}

if (process.env.NODE_ENV !== 'production') {
  console.log('Database URL detectada:', DATABASE_URL ? 'Configurada' : 'Nao configurada');
  if (DATABASE_URL) {
    console.log('Database URL (mascarada):', DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
  }
}

const isRailway = DATABASE_URL?.includes('railway.app') || DATABASE_URL?.includes('railway.internal');
const isRailwayExternal = DATABASE_URL?.includes('railway.app') && !DATABASE_URL?.includes('railway.internal');

// ─── Sequelize stub para ambiente sem banco (Vercel sem DATABASE_URL) ───────
// Evita instanciar o driver pg/sqlite3 — sync() e authenticate() resolvem sem erro.
class NoopSequelize {
  dialect = 'postgres' as any;
  async sync(): Promise<this> { return this; }
  async authenticate(): Promise<void> { /* noop */ }
  define(): any { return null; }
  async query(): Promise<any[]> { return [[]]; }
  literal(v: any) { return v; }
  fn(name: string, ...args: any[]) { return null; }
  col(v: string) { return v; }
  close(): void { /* noop */ }
}
// ────────────────────────────────────────────────────────────────────────────

let sequelize: Sequelize;
let hasDatabaseConnection = false;

if (DATABASE_URL) {
  try {
    const sequelizeConfig: any = {
      logging: false,
      dialect: 'postgres',
      pool: { 
        max: 5,
        min: 1,
        acquire: 30000,
        idle: 10000,
        evict: 10000
      },
      retry: { max: 3, timeout: 10000 }
    };

    if (DATABASE_URL.includes('postgres')) {
      sequelizeConfig.dialectOptions = {
        ssl: isRailwayExternal ? { require: true, rejectUnauthorized: false } : false
      };
    }

    sequelize = new Sequelize(DATABASE_URL, sequelizeConfig);
    hasDatabaseConnection = true;

    if (process.env.NODE_ENV === 'production') {
      sequelize.authenticate()
        .then(() => console.log('Conexao com PostgreSQL estabelecida'))
        .catch(err => console.error('Erro na conexao PostgreSQL:', err.message));
    }
  } catch (err) {
    // pg não disponível no bundle (ex: Vercel nft não rastreou o require dinâmico)
    console.warn('[models] Falha ao carregar driver pg, operando sem banco:', (err as Error).message);
    sequelize = new NoopSequelize() as unknown as Sequelize;
    hasDatabaseConnection = false;
  }
} else {
  // Sem DATABASE_URL: usa stub (Vercel ou ambiente sem banco)
  sequelize = new NoopSequelize() as unknown as Sequelize;
  hasDatabaseConnection = false;
}

// ═══════════════════════════════════════
// MODELO: Torrent
// ═══════════════════════════════════════

interface TorrentAttributes {
  infoHash: string;
  provider: string;
  title: string;
  size?: number;
  type: string;
  imdbId?: string;
  imdbSeason?: number;
  imdbEpisodeStart?: number;
  imdbEpisodeEnd?: number;
  seeders?: number;
  idioma?: string;
  qualidade?: string;
  uploadDate: Date;
  lastSeen: Date;
  rescrapeAt?: Date | null;
}

class Torrent extends Model<TorrentAttributes> implements TorrentAttributes {
  public infoHash!: string;
  public provider!: string;
  public title!: string;
  public size?: number;
  public type!: string;
  public imdbId?: string;
  public imdbSeason?: number;
  public imdbEpisodeStart?: number;
  public imdbEpisodeEnd?: number;
  public seeders?: number;
  public idioma?: string;
  public qualidade?: string;
  public uploadDate!: Date;
  public lastSeen!: Date;
  public rescrapeAt?: Date | null;
}

// Só inicializa o modelo se houver banco real (evita erros com stub)
if (DATABASE_URL && hasDatabaseConnection) {
  Torrent.init(
    {
      infoHash:   { type: DataTypes.STRING(64), primaryKey: true },
      provider:   { type: DataTypes.STRING(50) },
      title:      { type: DataTypes.TEXT },
      size:       { type: DataTypes.BIGINT },
      type:       { type: DataTypes.STRING(10) },
      imdbId:     { type: DataTypes.STRING(32) },
      imdbSeason: { type: DataTypes.INTEGER },
      imdbEpisodeStart: { type: DataTypes.INTEGER },
      imdbEpisodeEnd:   { type: DataTypes.INTEGER },
      seeders:    { type: DataTypes.INTEGER },
      idioma:     { type: DataTypes.STRING(50) },
      qualidade:  { type: DataTypes.STRING(10) },
      uploadDate: { type: DataTypes.DATE },
      lastSeen:   { type: DataTypes.DATE },
      rescrapeAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null }
    },
    {
      sequelize,
      modelName: 'Torrent',
      tableName: 'torrents',
      timestamps: false,
      indexes: [
        { fields: ['seeders'] },
        { fields: ['type'] },
        { fields: ['idioma'] },
        { fields: ['provider'] },
        { fields: ['uploadDate'] },
        { fields: ['imdbId', 'type'] }
      ]
    }
  );
}

export { sequelize, Torrent, hasDatabaseConnection };
