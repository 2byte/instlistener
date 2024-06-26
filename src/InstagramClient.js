import { until, By } from 'selenium-webdriver';
import {
    readFileSync,
    writeFileSync,
    accessSync,
    constants,
    mkdir,
} from 'node:fs';
import path from 'node:path';

export default class InstagramClient {
    rememberUser = false;
    dirCookies = './cookies/';
    pathFileCookies = null;
    username = null;
    password = null;
    failAuth = false;
    /**
     * @param {WebDriver} driver
     */
    driver = null;
    #errorLoadPage = false;

    constructor(driver) {
        this.driver = driver;
    }

    static init(driver) {
        return new InstagramClient(driver);
    }

    setDriver(driver) {
        this.driver = driver;
        return this;
    }

    async login(login, password) {
        this.username = login;
        this.password = password;

        this.pathFileCookies = path.resolve(
            this.dirCookies,
            this.username + '.json'
        );

        const doLogin = async () => {
            await this.driver.get('https://www.instagram.com');
            await this.driver.wait(until.elementLocated(By.css('main')), 10000);

            await this.driver
                .wait(
                    until.elementLocated(
                        By.xpath('//button[text()="Разрешить все cookie"]')
                    ),
                    20000
                )
                .then((elem) => {
                    this.log('Accept all cookie found');
                    return elem.click().then(() => {
                        return this.saveCookies();
                    });
                })
                .catch((err) => {
                    this.log('Accept all cookie not found');
                });

            try {
                await this.driver
                    .findElement({ css: 'input[name="username"]' })
                    .sendKeys(login);
                await this.driver
                    .findElement({ css: 'input[name="password"]' })
                    .sendKeys(password);
            } catch (err) {
                console.log('Inputs for login not found');
            }

            return this.driver
                .findElement({ css: 'button[type="submit"]' })
                .then((el) => {
                    console.log('Click button submit for login');

                    return el
                        .click()
                        .then((webElement) => {
                            return this.driver
                                .wait(
                                    until.elementLocated(
                                        By.css('#slfErrorAlert')
                                    ),
                                    10000
                                )
                                .then((elem) => {
                                    this.log('Error authentification found');
                                    let err = new Error(
                                        'Error authentification'
                                    );
                                    err.code = 401;

                                    this.failAuth = true;

                                    return Promise.reject(err);
                                })
                                .catch((err) => {
                                    if (err.code === 401) {
                                        return err;
                                    }

                                    this.log('Login is successfully');
                                    return this.driver
                                        .wait(
                                            until.elementLocated(
                                                By.xpath(
                                                    '//div[text()="Сохранить данные для входа?"]'
                                                )
                                            )
                                        )
                                        .then((formSaveData) => {
                                            this.log('Form save data found');
                                            return this.driver
                                                .findElement({
                                                    xpath: '//button[text()="Сохранить данные"]',
                                                })
                                                .click()
                                                .then(() => {
                                                    return clickSubmitNotification();
                                                });
                                        }, 10000);
                                });
                        })
                        .catch((err) => {
                            this.log('Error authentification');
                        });
                })
                .then(() => {
                    return this.saveCookies();
                })
                .catch((err) => {
                    this.log('Error click button submit for login');
                });
        };

        const clickSubmitNotification = () => {
            return this.driver
                .wait(
                    until.elementLocated(
                        By.xpath('//span[text()="Включить уведомления"]')
                    ),
                    10000
                )
                .then((elem) => {
                    this.log('Notification popup found');

                    return this.driver
                        .findElement({
                            xpath: '//button[text()="Включить"]',
                        })
                        .click();
                })
                .catch((err) => {
                    this.log('Popup notification not found');
                });
        };

        if (this.rememberUser) {
            await this.driver.get('https://www.instagram.com');

            this.log('Remember user');
            this.log(this.getCookiesByUser());

            const addCookiesPromise = [];

            const cookiesUser = this.getCookiesByUser();

            if (cookiesUser === null) {
                this.log('Cookie not found, try to login');
                return doLogin();
            }

            cookiesUser.forEach((cookie) => {
                addCookiesPromise.push(this.driver.manage().addCookie(cookie));
            });

            if (cookiesUser.length === 0) {
                return doLogin();
            }

            await Promise.all(addCookiesPromise);

            return this.driver.get('https://www.instagram.com').then((res) => {
                return this.driver
                    .wait(
                        until.elementLocated(
                            By.xpath('//span[text()="Reels"]')
                        ),
                        10000
                    )
                    .then(() => {
                        this.log('Login is successfully');

                        return clickSubmitNotification();
                    })
                    .catch((err) => {
                        return doLogin();
                    });
            });
        }

        await doLogin();

        return this;
    }

    relogin() {
        return this.login(this.username, this.password);
    }

    saveCookies() {
        return this.driver
            .manage()
            .getCookies()
            .then((cookies) => {
                this.log('Saving cookies', JSON.stringify(cookies));
                return writeFileSync(
                    this.pathFileCookies,
                    JSON.stringify(cookies)
                );
            });
    }

    getCookiesByUser() {
        try {
            return JSON.parse(readFileSync(this.pathFileCookies, 'utf-8'));
        } catch (err) {
            if (err.code === 'ENOENT') {
                return null;
            }
            throw new Error('Error parse cookies', { cause: err });
        }
    }

    setCookieStoragePath(path) {
        try {
            accessSync(path, constants.W_OK);
        } catch (err) {
            mkdir(path, { recursive: true }, (err) => {
                if (err) {
                    throw err;
                }
            });
        }

        this.pathFileCookies = path;

        return this;
    }

    log(...args) {
        console.log(...args);
    }

    useSession() {
        this.rememberUser = true;

        return this;
    }

    get failAuth() {
        return this.failAuth;
    }

    get isAuth() {
        return !this.failAuth;
    }


    async checkErrorLoadPage() {

        if ((await this.driver.getTitle()).includes('Не удалось загрузить')) {
            console.log('Error load page. Pause');
            this.#errorLoadPage = true;
            return true;
        }

        return false;
    }

    async parsePostsByUser(username, parseReel = false, {loadProfile = true} = {}) {
        //_aabd _aa8k  _al3l

        if (loadProfile) {
            const sourcePage = await this.driver.get(
                'https://www.instagram.com/' + username
            );
        }


        if (await this.checkErrorLoadPage()) {
            return false;
        }

        try {
            let elementPosts = [];

            if (!parseReel) {
                await this.driver.wait(until.elementLocated({ css: '._ac7v' }));
                elementPosts = await this.driver.findElements({
                    css: 'div.x1lliihq.x1n2onr6',
                });
            }
            if (parseReel) {
                elementPosts = await this.driver.findElements({ css: 'div.x1qjc9v5.x972fbf' });
            }

            const posts = [];

            for (const element of elementPosts) {
                let linkElem = null;
                try {
                    linkElem = await element.findElement({
                        css: 'a.x1i10hfl.xjbqb8w',
                    });
                } catch (err) {
                    console.log('Error parse link ' + await element.getText());
                    continue;
                }

                const hrefSegments = (
                    await linkElem.getAttribute('href')
                ).split('/');

                const imgElement = await element.findElement({
                    css: parseReel ? '.x1n2onr6.x1lvsgvq' : 'img.x5yr21d',
                });

                let caption = '';
                let displayUrl = '';
                if (parseReel) {
                    displayUrl = (await imgElement.getAttribute('style')).match(/url\("(.+)"\)/)[1];
                } else {
                    displayUrl = await imgElement.getAttribute('src');
                    caption = await imgElement.getAttribute('alt');
                }

                let is_attached = false;

                try {
                    is_attached = await linkElem.findElement({ css: 'svg[aria-label="Значок прикрепленной публикации"]' }).isDisplayed();
                } catch (err) {}

                posts.push({
                    display_url: await linkElem.getAttribute('href'),
                    thumbnail_url: displayUrl,
                    shortcode: hrefSegments[hrefSegments.length - 2],
                    caption,
                    is_attached,
                });
            }

            return posts;
        } catch (err) {
            throw new Error('Error parse posts user ' + username, {
                cause: err,
            });
        }
    }

    async getPostsByUser(username) {
        const sourcePosts = await this.driver.get(
            'https://www.instagram.com/' + username + '/?__a=1&__d=1'
        );

        try {
            //this.log((await this.driver.getPageSource()).substring(0, 2000))

            const posts = await this.driver
                .findElement({ tagName: 'pre' })
                .getText();

            return InstagramClient.handleJsonResponseWithPosts(posts);
        } catch (err) {
            //this.log(err);
            throw new Error('Error parse posts user ' + username, {
                cause: err,
            });
        }
    }

    async getNewPosts({
        accountModel,
        publics
    }) {
        const {posts, video} = publics;

        const getFreshPosts = async (posts, lastShortcode) => {
            const indexByShortcode = posts.findIndex((post, i) => {
                //console.log(post.shortcode, lastShortcode, post.shortcode === lastShortcode);
                return post.shortcode === lastShortcode;
            });
            if (indexByShortcode !== -1) {
                console.info('[OK] last post found')
            }
            if (indexByShortcode === -1) {
                console.log('last post not found, list posts', posts.map((post) => post.shortcode).join(' '));
                try {
                    const exists = await accountModel.isPostExists(posts[0].shortcode);
                    //console.log('exists', posts[0].shortcode, exists)
                    return !exists ? [posts[0]] : [];
                } catch (err) {
                    console.log(`Error checking on exists a post for user ${accountModel.username}`, posts[0], err)
                }
            }

            return (await getFreshPostsNotExistsDb(posts.slice(0, indexByShortcode))).reverse();
        };

        const getFreshPostsNotExistsDb = async (posts) => {
            const queryNotExistsPosts = posts.map((post) => new Promise(async (resolve, reject) => {
                try {
                    const exists = await accountModel.isPostExists(post.shortcode);
                    //console.log('exists', post.shortcode, exists)
                    resolve(!exists ? post : false)
                } catch (err) {
                    throw new Error('Error checking posts on exists', {cause: err})
                }
            }));
            return (await Promise.all(queryNotExistsPosts)).filter((post) => post !== false);
        };

        const returnPublics = {
            posts: [],
            video: [],
        };

        if (posts.length > 0) {
            const newPosts = await getFreshPosts(posts, (await accountModel.lastMediaPost)?.ig_shortcode);
            returnPublics.posts = newPosts;
            console.log('new posts', ...newPosts.map(item => item.shortcode))
        }

        if (video.length > 0) {
            const newPosts = await getFreshPosts(video, (await accountModel.lastMediaVideo)?.ig_shortcode);
            returnPublics.video = newPosts;
            console.log('new video', ...newPosts.map(item => item.shortcode))
        }

        return returnPublics;
    }

    async getPosts(igUsername) {

        const publics = {
            posts: [],
            video: [],
        };

        // Parse posts
        try {
            publics.posts = await this.parsePostsByUser(igUsername);
        } catch (err) {
            throw new Error(`Error getNewPosts username ${igUsername}`, {
                cause: err,
            });
        }

        // Parse video
        try {
            await this.driver.findElement({ css: 'a[href$="'+ igUsername +'/reels/"]' }).click();
            await new Promise((resolve) => setTimeout(resolve, 5000));
            publics.video = await this.parsePostsByUser(igUsername, true, {loadProfile: false});
        } catch (err) {
            throw new Error(`Error parse video getNewPosts username ${igUsername}`, {
                cause: err,
            });
        }

        publics.video.forEach((v) => {
            v.is_video = true;
        });

        return publics;
    }

    async getFirstPost(igUsername) {
        const publics = await this.getPosts(igUsername);

        return [publics.posts[0], publics.video[0]].filter((post) => post !== null && post !== undefined);
    }

    static handleJsonResponseWithPosts(data) {
        try {
            const responseData = JSON.parse(data);

            const postsEdges =
                responseData.graphql.user.edge_owner_to_timeline_media.edges;

            if (postsEdges.length === 0) {
                return [];
            }

            return postsEdges.map((edge) => {
                return {
                    shortcode: edge.node.shortcode,
                    caption:
                        edge.node.edge_media_to_caption.edges?.[0]?.node?.text,
                    display_url: edge.node.display_url,
                    thumbnail_url: edge.node.thumbnail_src,
                    likes: edge.node.edge_liked_by.count,
                    is_video: edge.node.is_video,
                };
            });
        } catch (err) {
            throw new Error('Error parse posts', { cause: err });
        }
    }

    haveErrorLoadPage() {
        return this.#errorLoadPage;
    }

    run() {}
}
