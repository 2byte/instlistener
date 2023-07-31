
## Requirements
```bash
npm i -g pm2
```

```bash
node apiServer --startWorker --withoutRunSelenium 
```

## SeleniumRunner
```javascript
import { describe, it, beforeAll, expect } from "vitest";
import { SeleniumEage } from "../src/SeleniumEdge";
import SeleniumRunner from "../src/SeleniumRunner";
import path from "node:path";

const seleniumEage = SeleniumEage.init(
    path.resolve(
        "../drivers/edgedriver_win64/msedgedriver.exe"
    )
);

const seleniumRunner = SeleniumRunner.init(
    await seleniumEage.initSelenium()
);

await seleniumRunner.testConnection();

await seleniumRunner.stop();
```

## InstagramClient
````javascript
import { SeleniumEage } from "../src/SeleniumEdge";
import path from "node:path";
import InstagramClient from "../src/InstagramClient";


const seleniumEdge = SeleniumEage.init(
    path.resolve(
        __dirname,
        "../drivers/edgedriver_win64/msedgedriver.exe"
    )
);

const actionExec = await InstagramClient.init(
    await seleniumEdge.initSelenium()
)
    .setCookieStoragePath(__dirname + "/cookies")
    .useSession()
    .login("login", "pass");

const posts await actionExec.getPostsByUser('login');
const newPosts await actionExec.getNewPosts('login');

```

# Api server
```bash
node apiServer --withoutRunSelenium 
node worker --start --withoutRunSelenium
```