declare module 'better-sqlite3' {
  interface Database {
    prepare(sql: string): Statement;
    pragma(sql: string): any;
    close(): void;
    exec(sql: string): Database;
  }
  interface Statement {
    run(...params: any[]): RunResult;
    get(...params: any[]): any;
    all(...params: any[]): any[];
  }
  interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }
  export default class BetterSqlite3 implements Database {
    constructor(filename: string, options?: any);
    prepare(sql: string): Statement;
    pragma(sql: string): any;
    close(): void;
    exec(sql: string): Database;
  }
}