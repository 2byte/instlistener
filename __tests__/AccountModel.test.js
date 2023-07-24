import { describe, it, beforeAll, expect, afterAll } from "vitest";
import db_connection from "../src/db_connection";
import AccountModel from "../src/AccountModel";
import InstagramClient from "../src/InstagramClient";
import { readFileSync } from "node:fs";
import AccountManager from "../src/AccountManager";

describe("AccountModel", () => {

    it('Adding media to account', async () => {

        const db = await db_connection;

        const result = await AccountModel.createTestAccounts(db);

        const accounts = (await AccountManager.init(db).loadAccounts()).accounts;
        const account = accounts.get(accounts.keys().next().value);

        const media = InstagramClient.handleJsonResponseWithPosts(
            readFileSync(__dirname +'/results/posts1.json')
        ).slice(0, 2);
        
        await account.addMedia(media);
    });
});