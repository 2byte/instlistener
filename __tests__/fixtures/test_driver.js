import SeleniumEdge from "../../src/SeleniumEdge";
import SeleniumRunner from "../../src/SeleniumRunner";
import path from "node:path";

const seleniumEdge = SeleniumEdge.init(
    path.resolve(
        __dirname,
        "../../drivers/edgedriver_win64/msedgedriver.exe"
    )
);

export default async () => {
    return SeleniumRunner.init(
        await seleniumEdge.initSelenium()
    );
}
