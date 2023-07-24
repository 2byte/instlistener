import AccountModel from './AccountModel.js';

export default class AccountManager {

    #accounts = new Map();
    /**
     * @type {sqlite3.Database}
     */
    db = null;

    constructor(db) {
        this.db = db;
    }

    static init(db) {
        return new AccountManager(db);
    }

    async loadAccounts() {

        await this.db.run("UPDATE `ig_track_accounts` SET `status` = 0 WHERE `tracking_end_date` <= date('now')");

        const accounts = await this.db.all("SELECT * FROM `ig_track_accounts` WHERE `status` = 1");

        for (let account of accounts) {
            this.#accounts.set(account.username, AccountModel.make(account, this.db));
        }

        return this;
    }

    get accounts() {
        return this.#accounts;
    }
}