import { defineConfig } from "vite";
import {resolve} from "path";

export default defineConfig({
    plugins: [
    ],
    test: {
        include: ["**/*.test.js"],
    },
});
