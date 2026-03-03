/// <reference types="astro/client" />

declare namespace App {
    interface Locals {
        runtime?: {
            env: import("./types").Env;
        };
    }
}
