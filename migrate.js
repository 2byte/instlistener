import db from './src/db_connection.js';

(async () => {
    const dbCon = await db;

    try {
        await dbCon.migrate({force: true});
        console.log('Migration successful');
    } catch (err) {
        console.dir(err);
    }
})()