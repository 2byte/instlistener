
import { Builder, Capabilities, By } from 'selenium-webdriver';
import { ServiceBuilder, Options as EdgeOptions } from 'selenium-webdriver/edge.js';
import proxy from 'selenium-webdriver/proxy.js';

export default class SeleniumGecko {

    driverPath = null;
    #driver = null;

    constructor(driverPath) {
        this.driverPath = driverPath;
    }

    async initSelenium() {

        //const opts = new EdgeOptions().setProxy(proxy.manual({http: "5.61.39.81:8888"}))
        const opts = new EdgeOptions()
            .addArguments('--disable-notifications')
            //.addArguments('--disable-features=msEdgeJSONViewer')

        this.#driver = await new Builder()
            .forBrowser("firefox")
            .withCapabilities(Capabilities.firefox())
            .setFirefoxService(new ServiceBuilder(this.driverPath))
            .setFirefoxOptions(opts)
            //.setProxy(proxy.manual({http: 'host:1234'}))
            .build();
        
        console.log("Selenium Firefox Driver initialized");

        return this.#driver;
    }

    static init(driverPath) {
        return new SeleniumGecko(driverPath);
    }

    get driver() {
        return this.#driver;
    }
}