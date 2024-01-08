import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve as pathResolve } from 'path';

export default (async () => {
    let pathtoDatabase = null;

    // if (process?.env?.VITEST) {
    //     pathtoDatabase = dirname(fileURLToPath(import.meta.url)) + "/../database/database.db";
    // } else {
    //     dirname = dirname(fileURLToPath(import.meta.url)) +"/database/database.db";
    // }
    
    pathtoDatabase = pathResolve(
        dirname(fileURLToPath(import.meta.url)) + '/../database/database.db'
    );

    sqlite3.verbose();

    return await open({
        filename: pathtoDatabase,
        driver: sqlite3.cached.Database,
    });
})();
