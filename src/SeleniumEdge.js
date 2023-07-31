
import { Builder, Capabilities, By } from 'selenium-webdriver';
import { ServiceBuilder, Options as EdgeOptions } from 'selenium-webdriver/edge.js';
import proxy from 'selenium-webdriver/proxy.js';

export default class SeleniumEage {

    driverPath = null;
    #driver = null;

    constructor(driverPath) {
        this.driverPath = driverPath;
    }

    async initSelenium() {

        //const opts = new EdgeOptions().setProxy(proxy.manual({http: "5.61.39.81:8888"}))
        const opts = new EdgeOptions().addArguments('--disable-notifications')

        this.#driver = await new Builder()
        .forBrowser("edge")
        .withCapabilities(Capabilities.edge())
        .setEdgeService(new ServiceBuilder(this.driverPath))
        .setEdgeOptions(opts)
        //.setProxy(proxy.manual({http: 'host:1234'}))
        .build();
        console.log("Selenium Edge Driver initialized");
        return this.#driver;
    }

    static init(driverPath) {
        return new SeleniumEage(driverPath);
    }

    get driver() {
        return this.#driver;
    }
}