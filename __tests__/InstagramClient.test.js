import { describe, it, beforeAll, expect, vi } from 'vitest';
import InstagramClient from '../src/InstagramClient';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

describe('Instagram Client', () => {
    config({ path: __dirname + '/../.env' });

    it('Handle instagram posts', async () => {
        const testDriver = (await import('./fixtures/test_driver'))();

        const testPostsJson = readFileSync(__dirname + '/results/posts1.json');
        const testPosts =
            InstagramClient.handleJsonResponseWithPosts(testPostsJson);

        InstagramClient.prototype.getPostsByUser = vi
            .fn()
            .mockImplementation(async () => {
                return testPosts;
            });

        const instagramClient = InstagramClient.init(testDriver);

        await testDriver.driver.quit();

        const result =
            InstagramClient.handleJsonResponseWithPosts(testPostsJson);

        expect(result.length).toBeGreaterThan(0);

        const postIndex3 = result[2];

        const newPosts = await instagramClient.getNewPosts(
            'testuser',
            postIndex3.shortcode
        );
        //console.log(newPosts);
        expect(newPosts).toHaveLength(2);
        expect(newPosts[0].shortcode).toEqual(result[1].shortcode);
        expect(newPosts[1].shortcode).toEqual(result[0].shortcode);
    });

    it('Handle instagram posts with reels', async () => {
        const testDriver = (await import('./fixtures/test_driver')).default();

        const instagramClient = InstagramClient.init((await testDriver).driver);

        await instagramClient
            .useSession()
            .login(process.env.IG_LOGIN, process.env.IG_PASS);

        const accountModel = vi.fn(() => ({
            username: 'tsum_moscow',
            get lastMediaPost() {
                return Promise.resolve({ ig_shortcode: 'C5n8-ySi0en' });
            },
            get lastMediaVideo() {
                return Promise.resolve({ ig_shortcode: 'C5YGHweJIU5' });
            },
            isPostExists() {
                return Promise.resolve(false);
            }
        }));

        const model = new accountModel();
        const publics = await instagramClient.getPosts(model.username);
        //console.log(publics);
        const newPublics = await instagramClient.getNewPosts({
            accountModel: model,
            publics,
        });
        console.log(newPublics.posts.length);
        expect(newPublics.posts.length).toBeGreaterThan(0);
        expect(newPublics.posts[0].shortcode).toEqual('C5oCiwJiBwy');
        expect(newPublics.video[0].shortcode).toEqual('C5akN2wL0Ki');
    }, 70000);

    it('Testing getFreshPosts posts', async () => {
        const testDriver = vi.fn();

        const instagramClient = InstagramClient.init((await testDriver).driver);

        const testPostsJson = JSON.parse(
            readFileSync(__dirname + '/results/parsed_posts.json')
        );

        const accountModel = class {
            get lastMediaPost() {
                return Promise.resolve({ ig_shortcode: 'code2' });
            }
            get lastMediaVideo() {
                return Promise.resolve({ ig_shortcode: 'code2' });
            }
        };

        accountModel.prototype.isPostExists = vi
            .fn()
            .mockImplementation(async (shortcode) => {
                if (['code4', 'code3'].includes(shortcode)) {
                    return false;
                }
                return true;
            });

        // Getting new posts
        const newPosts = await instagramClient.getNewPosts({
            accountModel: new accountModel(),
            publics: testPostsJson,
        });
        //console.log(newPosts);
        expect(newPosts.posts.length).toEqual(2);
        expect(newPosts.video.length).toEqual(2);

        expect(newPosts.posts[0].shortcode).toEqual('code3');
        expect(newPosts.posts[1].shortcode).toEqual('code4');

        expect(newPosts.video[0].shortcode).toEqual('code3');
        expect(newPosts.video[1].shortcode).toEqual('code4');
   });

    it('Testing getFreshPosts posts with attached posts', async () => {
        const testDriver = vi.fn();

        const instagramClient = InstagramClient.init((await testDriver).driver);

        const testPostsJson = JSON.parse(
            readFileSync(__dirname + '/results/parsed_posts.json')
        );

        const accountModel = class {
            get lastMediaPost() {
                return Promise.resolve({ ig_shortcode: 'code1' });
            }
            get lastMediaVideo() {
                return Promise.resolve({ ig_shortcode: 'code1' });
            }
        };

        accountModel.prototype.isPostExists = vi
            .fn()
            .mockImplementation(async (shortcode) => {
                if (['code4', 'code1'].includes(shortcode)) {
                    return false;
                }
                return true;
            });

        testPostsJson.posts[0].is_attached = 1;

        Object.defineProperties(accountModel, {
            lastMediaPost: Promise.resolve({ ig_shortcode: 'code1' }),
        });
        accountModel.prototype.isPostExists = vi
            .fn()
            .mockImplementation(async (shortcode) => {
                if (['code4', 'code1'].includes(shortcode)) {
                    return true;
                }
                return false;
            });

        const new2posts = await instagramClient.getNewPosts({
            accountModel: new accountModel(),
            publics: testPostsJson,
        });

        expect(new2posts.posts.length).toEqual(2);
        expect(new2posts.posts[0].shortcode).toEqual('code2');
        expect(new2posts.posts[1].shortcode).toEqual('code3');
    });

    it('Testing getFreshPosts posts with attached video', async () => {
        const testDriver = vi.fn();

        const instagramClient = InstagramClient.init((await testDriver).driver);

        const testPostsJson = JSON.parse(
            readFileSync(__dirname + '/results/parsed_posts.json')
        );

        const accountModel = class {
            get lastMediaPost() {
                return Promise.resolve({ ig_shortcode: 'code1' });
            }
            get lastMediaVideo() {
                return Promise.resolve({ ig_shortcode: 'code1' });
            }
        };

        accountModel.prototype.isPostExists = vi
            .fn()
            .mockImplementation(async (shortcode) => {
                if (['code4', 'code1'].includes(shortcode)) {
                    return false;
                }
                return true;
            });

        testPostsJson.posts[0].is_attached = 1;

        Object.defineProperties(accountModel, {
            lastMediaPost: Promise.resolve({ ig_shortcode: 'code1' }),
        });
        accountModel.prototype.isPostExists = vi
            .fn()
            .mockImplementation(async (shortcode) => {
                if (['code4', 'code1'].includes(shortcode)) {
                    return true;
                }
                return false;
            });

        testPostsJson.posts = [];
        testPostsJson.video[0].is_attached = 1;

        const new2video = await instagramClient.getNewPosts({
            accountModel: new accountModel(),
            publics: testPostsJson,
        });

        expect(new2video.video.length).toEqual(2);
        expect(new2video.video[0].shortcode).toEqual('code2');
        expect(new2video.video[1].shortcode).toEqual('code3');
    });
});
