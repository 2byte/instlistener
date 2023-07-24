import { describe, it, beforeAll, expect, vi } from "vitest";
import InstagramClient from "../src/InstagramClient";
import testDriver from './fixtures/test_driver';
import { readFileSync } from 'fs';

describe("Instagram Client", () => {

    it('Handle instagram posts', async () => {

        const testDriver = (await import('./fixtures/test_driver'))();
        
        const testPostsJson = readFileSync(__dirname + '/results/posts1.json');
        const testPosts = InstagramClient.handleJsonResponseWithPosts(testPostsJson);

        InstagramClient.prototype.getPostsByUser = vi.fn().mockImplementation(async () => {
            return testPosts;
        });

        const instagramClient = InstagramClient.init(testDriver);

        await testDriver.driver.quit();

        const result = InstagramClient.handleJsonResponseWithPosts(testPostsJson);

        expect(result.length).toBeGreaterThan(0);

        const postIndex3 = result[2];

        const newPosts = await instagramClient.getNewPosts('testuser', postIndex3.shortcode);
        //console.log(newPosts);
        expect(newPosts).toHaveLength(2);
        expect(newPosts[0].shortcode).toEqual(result[1].shortcode);
        expect(newPosts[1].shortcode).toEqual(result[0].shortcode);
    });
});