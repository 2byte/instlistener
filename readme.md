
## Requirements
```bash
npm i -g pm2
```

```bash
node apiServer --withoutRunWorker --withoutRunSelenium 
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
```javascript
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
node apiServer --withoutRunWorker --withoutRunSelenium 
node worker --withoutRunWorker --withoutRunSelenium
```

# Api methods
```javascript
GET api/v1/accounts/all
POST api/v1/accounts/add
    - accountData: (username, date)
GET api/v1/accounts/:id
GET api/v1/accounts/:id/medias/new
    - id - account id (number or 'all')
## return {
    'id' integer
    'account_id' int(11)
    'ig_shortcode' varchar(100)
    'url' varchar(255)
    'caption' varchar(255)
    'thumbnail_url' varchar(255)
    'is_video' tinyint(1)
    'is_new' tinyint(1)
    'created_at' datetime
    'updated_at' datetime
}[]

GET api/v1/accounts/:id/medias
POST api/v1/accounts/:id/fake
    - count
    - isNew (default 0)
POST api/v1/accounts/:id/delete
POST api/v1/accounts/:id/track
    - mode: (enable, disable)
    - accountId
    - date (datetime)
GET api/v1/app/start
GET api/v1/app/status
GET api/v1/app/stop
```