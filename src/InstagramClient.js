import { until, By } from 'selenium-webdriver';
import {
    readFileSync,
    writeFileSync,
    accessSync,
    access,
    constants,
    mkdir,
    link,
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

    async parsePostsByUser(username) {
        //_aabd _aa8k  _al3l

        this.#errorLoadPage = false;

        const sourcePage = await this.driver.get(
            'https://www.instagram.com/' + username
        );


        if ((await this.driver.getTitle()).includes('Не удалось загрузить')) {
            this.#errorLoadPage = true;
            return false;
        }

        try {
            await this.driver.wait(until.elementLocated({ css: '._aabd' }));

            const elementPosts = await this.driver.findElements({
                css: '._aabd',
            });

            const posts = [];

            for (const element of elementPosts) {
                const linkElem = await element.findElement({
                    css: 'a.x1i10hfl.xjbqb8w',
                });
                const hrefSegments = (
                    await linkElem.getAttribute('href')
                ).split('/');
                const imgElement = await element.findElement({
                    css: 'img.x5yr21d',
                });
                const displayUrl = await imgElement.getAttribute('src');
                const caption = await imgElement.getAttribute('alt');
                let type = null;

                try {
                    type = await linkElem
                        .findElement({ css: '._aatp svg' })
                        .getAttribute('aria-label');
                } catch (err) {}

                posts.push({
                    display_url: await linkElem.getAttribute('href'),
                    thumbnail_url: displayUrl,
                    shortcode: hrefSegments[hrefSegments.length - 2],
                    caption,
                    is_video: type === 'Клип',
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

    async getNewPosts(igUsername, lastShortcode) {
        try {
            const posts = await this.parsePostsByUser(igUsername);

            if (posts === false) {
                return [];
            }

            const indexByShortcode = posts.findIndex((post, i) => {
                //console.log('Equal shortcode', post.shortcode, lastShortcode)
                return post.shortcode === lastShortcode;
            });

            if (indexByShortcode === -1) {
                return posts[0];
            }

            return posts.slice(0, indexByShortcode).reverse();
        } catch (err) {
            throw new Error(`Error getNewPosts username ${igUsername}`, {
                cause: err,
            });
        }
    }

    async getFirstPost(igUsername) {
        return (await this.parsePostsByUser(igUsername))[0];
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
