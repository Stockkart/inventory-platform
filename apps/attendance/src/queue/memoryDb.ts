/**
 * In-memory {@link SqlDatabase} for tests of the offline queue and of the code that drives it
 * (`SyncWorker`, the home screen). It interprets the subset of SQL the queue writes, so the tests
 * run the queue's real statements rather than a stand-in:
 *
 * - `CREATE TABLE [IF NOT EXISTS] t (col TYPE [PRIMARY KEY] [NOT NULL] [DEFAULT lit] [CHECK (col IN (…))], …)`
 * - `CREATE [UNIQUE] INDEX [IF NOT EXISTS] …` (accepted, no effect)
 * - `INSERT INTO t (cols) VALUES (values)`
 * - `UPDATE t SET col = value, … [WHERE conditions]`
 * - `DELETE FROM t [WHERE conditions]`
 * - `SELECT * | COUNT(*) [AS name] | col, … FROM t [WHERE conditions] [ORDER BY col [ASC|DESC], …] [LIMIT n]`
 * - conditions: `col op value` joined by `AND`, `op` ∈ `= != <> < <= > >=`, `col IS [NOT] NULL`
 * - values: `?` (positional parameter), `'text'` (`''` escapes a quote), a number, `NULL`
 *
 * Comparisons follow SQLite for the types the queue stores: numbers numerically, text by code
 * point, NULL never equal to anything. Primary key uniqueness, NOT NULL, DEFAULT and the `IN`
 * CHECK constraints are enforced, so a bad write fails here as it would on the phone.
 * `withTransactionAsync` snapshots every table and restores it when the task throws.
 *
 * Nothing here runs on a phone; the app opens `expo-sqlite` through `./expoDb.ts`.
 */
import type { SqlDatabase, SqlParams, SqlRunResult, SqlValue } from './db';

type Row = Map<string, SqlValue>;

interface Column {
  name: string;
  primaryKey: boolean;
  notNull: boolean;
  defaultValue: SqlValue | undefined;
  allowed: SqlValue[] | undefined;
}

interface Table {
  columns: Column[];
  rows: Row[];
}

type Condition =
  | { kind: 'compare'; column: string; op: string; value: SqlValue }
  | { kind: 'null'; column: string; negated: boolean };

interface OrderTerm {
  column: string;
  descending: boolean;
}

export class MemoryDatabase implements SqlDatabase {
  private tables = new Map<string, Table>();
  private inTransaction = false;
  private closed = false;

  /** Every row of a table, as plain objects, for assertions. */
  dump(table: string): Record<string, SqlValue>[] {
    return this.table(table).rows.map((row) => Object.fromEntries(row));
  }

  async execAsync(source: string): Promise<void> {
    this.assertOpen();
    for (const statement of splitStatements(source)) {
      this.execute(statement, []);
    }
  }

  async runAsync(source: string, params: SqlParams): Promise<SqlRunResult> {
    this.assertOpen();
    const result = this.execute(source, params);
    return { changes: result.changes, lastInsertRowId: 0 };
  }

  async getAllAsync<T>(source: string, params: SqlParams): Promise<T[]> {
    this.assertOpen();
    return this.execute(source, params).rows as T[];
  }

  async getFirstAsync<T>(source: string, params: SqlParams): Promise<T | null> {
    const rows = await this.getAllAsync<T>(source, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    this.assertOpen();
    if (this.inTransaction) {
      throw new Error('cannot start a transaction within a transaction');
    }
    const snapshot = new Map<string, Table>();
    for (const [name, table] of this.tables) {
      snapshot.set(name, { columns: table.columns, rows: table.rows.map((row) => new Map(row)) });
    }
    this.inTransaction = true;
    try {
      await task();
    } catch (error) {
      this.tables = snapshot;
      throw error;
    } finally {
      this.inTransaction = false;
    }
  }

  async closeAsync(): Promise<void> {
    this.closed = true;
  }

  // --- execution ---

  private execute(source: string, params: SqlParams): { changes: number; rows: object[] } {
    const parser = new Parser(tokenize(source), params);
    const statement = parser.statement();
    switch (statement.kind) {
      case 'createTable':
        if (!this.tables.has(statement.name)) {
          this.tables.set(statement.name, { columns: statement.columns, rows: [] });
        } else if (!statement.ifNotExists) {
          throw new Error(`table ${statement.name} already exists`);
        }
        return { changes: 0, rows: [] };
      case 'createIndex':
        return { changes: 0, rows: [] };
      case 'insert':
        return { changes: this.insert(statement), rows: [] };
      case 'update':
        return { changes: this.update(statement), rows: [] };
      case 'delete':
        return { changes: this.delete(statement), rows: [] };
      case 'select':
        return { changes: 0, rows: this.select(statement) };
    }
  }

  private insert(statement: InsertStatement): number {
    const table = this.table(statement.table);
    const row: Row = new Map();
    for (const column of table.columns) {
      const index = statement.columns.indexOf(column.name);
      const value = index >= 0 ? statement.values[index] : column.defaultValue ?? null;
      row.set(column.name, value);
    }
    for (const name of statement.columns) {
      this.column(table, name);
    }
    this.check(table, row);
    table.rows.push(row);
    return 1;
  }

  private update(statement: UpdateStatement): number {
    const table = this.table(statement.table);
    let changes = 0;
    for (const row of table.rows) {
      if (!matches(row, statement.where)) {
        continue;
      }
      const updated = new Map(row);
      for (const [name, value] of statement.assignments) {
        this.column(table, name);
        updated.set(name, value);
      }
      this.check(table, updated, row);
      for (const [name, value] of updated) {
        row.set(name, value);
      }
      changes++;
    }
    return changes;
  }

  private delete(statement: DeleteStatement): number {
    const table = this.table(statement.table);
    const before = table.rows.length;
    table.rows = table.rows.filter((row) => !matches(row, statement.where));
    return before - table.rows.length;
  }

  private select(statement: SelectStatement): object[] {
    const table = this.table(statement.table);
    let rows = table.rows.filter((row) => matches(row, statement.where));
    if (statement.count !== undefined) {
      return [{ [statement.count]: rows.length }];
    }
    if (statement.orderBy.length > 0) {
      rows = [...rows].sort((a, b) => {
        for (const term of statement.orderBy) {
          const order = compare(a.get(term.column) ?? null, b.get(term.column) ?? null);
          if (order !== 0) {
            return term.descending ? -order : order;
          }
        }
        return 0;
      });
    }
    if (statement.limit !== undefined) {
      rows = rows.slice(0, statement.limit);
    }
    const columns = statement.columns ?? table.columns.map((column) => column.name);
    return rows.map((row) => {
      const out: Record<string, SqlValue> = {};
      for (const name of columns) {
        this.column(table, name);
        out[name] = row.get(name) ?? null;
      }
      return out;
    });
  }

  // --- constraints ---

  private check(table: Table, row: Row, replacing?: Row): void {
    for (const column of table.columns) {
      const value = row.get(column.name) ?? null;
      if (value === null && (column.notNull || column.primaryKey)) {
        throw new Error(`NOT NULL constraint failed: ${column.name}`);
      }
      if (column.allowed && !column.allowed.some((allowed) => compare(allowed, value) === 0)) {
        throw new Error(`CHECK constraint failed: ${column.name}`);
      }
      if (
        column.primaryKey &&
        table.rows.some(
          (other) => other !== replacing && compare(other.get(column.name) ?? null, value) === 0,
        )
      ) {
        throw new Error(`UNIQUE constraint failed: ${column.name}`);
      }
    }
  }

  private table(name: string): Table {
    const table = this.tables.get(name);
    if (!table) {
      throw new Error(`no such table: ${name}`);
    }
    return table;
  }

  private column(table: Table, name: string): Column {
    const column = table.columns.find((candidate) => candidate.name === name);
    if (!column) {
      throw new Error(`no such column: ${name}`);
    }
    return column;
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error('database is closed');
    }
  }
}

// --- evaluation ---

function matches(row: Row, conditions: Condition[]): boolean {
  return conditions.every((condition) => {
    const value = row.get(condition.column) ?? null;
    if (condition.kind === 'null') {
      return (value === null) !== condition.negated;
    }
    if (value === null || condition.value === null) {
      return false;
    }
    const order = compare(value, condition.value);
    switch (condition.op) {
      case '=':
        return order === 0;
      case '!=':
      case '<>':
        return order !== 0;
      case '<':
        return order < 0;
      case '<=':
        return order <= 0;
      case '>':
        return order > 0;
      case '>=':
        return order >= 0;
      default:
        throw new Error(`unsupported operator ${condition.op}`);
    }
  });
}

/** SQLite order for the stored types: NULL < numbers < text; numbers numeric, text by code point. */
function compare(a: SqlValue, b: SqlValue): number {
  if (a === null || b === null) {
    return a === b ? 0 : a === null ? -1 : 1;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  if (typeof a === 'number') {
    return -1;
  }
  if (typeof b === 'number') {
    return 1;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

// --- parsing ---

type Token =
  | { kind: 'word'; text: string }
  | { kind: 'string'; text: string }
  | { kind: 'number'; value: number }
  | { kind: 'symbol'; text: string };

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      i++;
    } else if (ch === "'") {
      let text = '';
      i++;
      for (;;) {
        if (i >= source.length) {
          throw new Error('unterminated string literal');
        }
        if (source[i] === "'") {
          if (source[i + 1] === "'") {
            text += "'";
            i += 2;
            continue;
          }
          i++;
          break;
        }
        text += source[i++];
      }
      tokens.push({ kind: 'string', text });
    } else if (/[0-9]/.test(ch) || (ch === '-' && /[0-9]/.test(source[i + 1] ?? ''))) {
      const match = /^-?\d+(\.\d+)?/.exec(source.slice(i));
      if (!match) {
        throw new Error(`bad number at ${i}`);
      }
      tokens.push({ kind: 'number', value: Number(match[0]) });
      i += match[0].length;
    } else if (/[A-Za-z_]/.test(ch)) {
      const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(i));
      if (!match) {
        throw new Error(`bad identifier at ${i}`);
      }
      tokens.push({ kind: 'word', text: match[0] });
      i += match[0].length;
    } else {
      const two = source.slice(i, i + 2);
      if (two === '<=' || two === '>=' || two === '!=' || two === '<>') {
        tokens.push({ kind: 'symbol', text: two });
        i += 2;
      } else if ('(),;=<>*?'.includes(ch)) {
        tokens.push({ kind: 'symbol', text: ch });
        i++;
      } else {
        throw new Error(`unexpected character ${JSON.stringify(ch)} at ${i}`);
      }
    }
  }
  return tokens;
}

/** Splits on `;` outside string literals; empty statements are dropped. */
function splitStatements(source: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inString = false;
  for (const ch of source) {
    if (ch === "'") {
      inString = !inString;
    }
    if (ch === ';' && !inString) {
      statements.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  statements.push(current);
  return statements.filter((statement) => statement.trim().length > 0);
}

interface CreateTableStatement {
  kind: 'createTable';
  name: string;
  ifNotExists: boolean;
  columns: Column[];
}
interface InsertStatement {
  kind: 'insert';
  table: string;
  columns: string[];
  values: SqlValue[];
}
interface UpdateStatement {
  kind: 'update';
  table: string;
  assignments: [string, SqlValue][];
  where: Condition[];
}
interface DeleteStatement {
  kind: 'delete';
  table: string;
  where: Condition[];
}
interface SelectStatement {
  kind: 'select';
  table: string;
  /** undefined = `*` */
  columns: string[] | undefined;
  /** The alias of `COUNT(*)` when the select is a count. */
  count: string | undefined;
  where: Condition[];
  orderBy: OrderTerm[];
  limit: number | undefined;
}
type Statement =
  | CreateTableStatement
  | { kind: 'createIndex' }
  | InsertStatement
  | UpdateStatement
  | DeleteStatement
  | SelectStatement;

class Parser {
  private position = 0;
  private nextParam = 0;

  constructor(private readonly tokens: Token[], private readonly params: SqlParams) {}

  statement(): Statement {
    const keyword = this.word().toUpperCase();
    let statement: Statement;
    switch (keyword) {
      case 'CREATE':
        statement = this.create();
        break;
      case 'INSERT':
        statement = this.insert();
        break;
      case 'UPDATE':
        statement = this.update();
        break;
      case 'DELETE':
        statement = this.delete();
        break;
      case 'SELECT':
        statement = this.select();
        break;
      default:
        throw new Error(`unsupported statement ${keyword}`);
    }
    this.acceptSymbol(';');
    if (this.position < this.tokens.length) {
      throw new Error(`unexpected trailing token ${describe(this.tokens[this.position])}`);
    }
    if (this.nextParam !== this.params.length) {
      throw new Error(`expected ${this.nextParam} parameters, got ${this.params.length}`);
    }
    return statement;
  }

  private create(): Statement {
    this.acceptWord('UNIQUE');
    if (this.acceptWord('INDEX')) {
      // CREATE [UNIQUE] INDEX [IF NOT EXISTS] name ON table (cols): no effect in memory.
      this.position = this.tokens.length;
      return { kind: 'createIndex' };
    }
    this.expectWord('TABLE');
    const ifNotExists = this.acceptWord('IF');
    if (ifNotExists) {
      this.expectWord('NOT');
      this.expectWord('EXISTS');
    }
    const name = this.word();
    this.expectSymbol('(');
    const columns: Column[] = [];
    do {
      columns.push(this.columnDefinition());
    } while (this.acceptSymbol(','));
    this.expectSymbol(')');
    return { kind: 'createTable', name, ifNotExists, columns };
  }

  private columnDefinition(): Column {
    const name = this.word();
    this.word(); // type name; SQLite types are advisory and the queue binds the right type
    const column: Column = {
      name,
      primaryKey: false,
      notNull: false,
      defaultValue: undefined,
      allowed: undefined,
    };
    for (;;) {
      if (this.acceptWord('PRIMARY')) {
        this.expectWord('KEY');
        column.primaryKey = true;
      } else if (this.acceptWord('NOT')) {
        this.expectWord('NULL');
        column.notNull = true;
      } else if (this.acceptWord('DEFAULT')) {
        column.defaultValue = this.literal();
      } else if (this.acceptWord('CHECK')) {
        this.expectSymbol('(');
        const checked = this.word();
        if (checked !== name) {
          throw new Error(`CHECK on ${name} must name that column`);
        }
        this.expectWord('IN');
        this.expectSymbol('(');
        const allowed: SqlValue[] = [];
        do {
          allowed.push(this.literal());
        } while (this.acceptSymbol(','));
        this.expectSymbol(')');
        this.expectSymbol(')');
        column.allowed = allowed;
      } else {
        return column;
      }
    }
  }

  private insert(): InsertStatement {
    this.expectWord('INTO');
    const table = this.word();
    this.expectSymbol('(');
    const columns = this.nameList();
    this.expectSymbol(')');
    this.expectWord('VALUES');
    this.expectSymbol('(');
    const values: SqlValue[] = [];
    do {
      values.push(this.value());
    } while (this.acceptSymbol(','));
    this.expectSymbol(')');
    if (values.length !== columns.length) {
      throw new Error(`${columns.length} columns but ${values.length} values`);
    }
    return { kind: 'insert', table, columns, values };
  }

  private update(): UpdateStatement {
    const table = this.word();
    this.expectWord('SET');
    const assignments: [string, SqlValue][] = [];
    do {
      const column = this.word();
      this.expectSymbol('=');
      assignments.push([column, this.value()]);
    } while (this.acceptSymbol(','));
    return { kind: 'update', table, assignments, where: this.where() };
  }

  private delete(): DeleteStatement {
    this.expectWord('FROM');
    const table = this.word();
    return { kind: 'delete', table, where: this.where() };
  }

  private select(): SelectStatement {
    let columns: string[] | undefined;
    let count: string | undefined;
    if (this.acceptSymbol('*')) {
      columns = undefined;
    } else if (this.peekWord('COUNT')) {
      this.word();
      this.expectSymbol('(');
      this.expectSymbol('*');
      this.expectSymbol(')');
      count = this.acceptWord('AS') ? this.word() : 'COUNT(*)';
    } else {
      columns = this.nameList();
    }
    this.expectWord('FROM');
    const table = this.word();
    const where = this.where();
    const orderBy: OrderTerm[] = [];
    if (this.acceptWord('ORDER')) {
      this.expectWord('BY');
      do {
        const column = this.word();
        const descending = this.acceptWord('DESC');
        if (!descending) {
          this.acceptWord('ASC');
        }
        orderBy.push({ column, descending });
      } while (this.acceptSymbol(','));
    }
    let limit: number | undefined;
    if (this.acceptWord('LIMIT')) {
      const value = this.value();
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
        throw new Error('LIMIT must be a non-negative integer');
      }
      limit = value;
    }
    return { kind: 'select', table, columns, count, where, orderBy, limit };
  }

  private where(): Condition[] {
    if (!this.acceptWord('WHERE')) {
      return [];
    }
    const conditions: Condition[] = [];
    do {
      const column = this.word();
      if (this.acceptWord('IS')) {
        const negated = this.acceptWord('NOT');
        this.expectWord('NULL');
        conditions.push({ kind: 'null', column, negated });
        continue;
      }
      const op = this.symbol();
      if (!['=', '!=', '<>', '<', '<=', '>', '>='].includes(op)) {
        throw new Error(`unsupported operator ${op}`);
      }
      conditions.push({ kind: 'compare', column, op, value: this.value() });
    } while (this.acceptWord('AND'));
    return conditions;
  }

  // --- terminals ---

  private nameList(): string[] {
    const names: string[] = [];
    do {
      names.push(this.word());
    } while (this.acceptSymbol(','));
    return names;
  }

  /** A `?` resolved against the next positional parameter, or a literal. */
  private value(): SqlValue {
    if (this.acceptSymbol('?')) {
      if (this.nextParam >= this.params.length) {
        throw new Error('too few parameters');
      }
      const value = this.params[this.nextParam++];
      if (value !== null && typeof value !== 'string' && typeof value !== 'number') {
        throw new Error(`unsupported parameter type ${typeof value}`);
      }
      return value;
    }
    return this.literal();
  }

  private literal(): SqlValue {
    const token = this.next();
    if (token.kind === 'string') {
      return token.text;
    }
    if (token.kind === 'number') {
      return token.value;
    }
    if (token.kind === 'word' && token.text.toUpperCase() === 'NULL') {
      return null;
    }
    throw new Error(`expected a literal, got ${describe(token)}`);
  }

  private word(): string {
    const token = this.next();
    if (token.kind !== 'word') {
      throw new Error(`expected a name, got ${describe(token)}`);
    }
    return token.text;
  }

  private symbol(): string {
    const token = this.next();
    if (token.kind !== 'symbol') {
      throw new Error(`expected a symbol, got ${describe(token)}`);
    }
    return token.text;
  }

  private peekWord(text: string): boolean {
    const token = this.tokens[this.position];
    return token?.kind === 'word' && token.text.toUpperCase() === text;
  }

  private acceptWord(text: string): boolean {
    if (this.peekWord(text)) {
      this.position++;
      return true;
    }
    return false;
  }

  private expectWord(text: string): void {
    if (!this.acceptWord(text)) {
      throw new Error(`expected ${text}, got ${describe(this.tokens[this.position])}`);
    }
  }

  private acceptSymbol(text: string): boolean {
    const token = this.tokens[this.position];
    if (token?.kind === 'symbol' && token.text === text) {
      this.position++;
      return true;
    }
    return false;
  }

  private expectSymbol(text: string): void {
    if (!this.acceptSymbol(text)) {
      throw new Error(`expected ${text}, got ${describe(this.tokens[this.position])}`);
    }
  }

  private next(): Token {
    const token = this.tokens[this.position];
    if (!token) {
      throw new Error('unexpected end of statement');
    }
    this.position++;
    return token;
  }
}

function describe(token: Token | undefined): string {
  if (!token) {
    return 'end of statement';
  }
  return token.kind === 'number' ? String(token.value) : token.text;
}
