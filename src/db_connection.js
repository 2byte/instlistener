import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export default (async () => {
    const pathtoDatabase = process?.env?.VITEST
        ? dirname(fileURLToPath(import.meta.url)) + "/../database/database.db"
        : process.cwd() + "/database/database.db";

    sqlite3.verbose();
    
    return await open({
        filename: pathtoDatabase,
        driver: sqlite3.cached.Database,
    });
})();
