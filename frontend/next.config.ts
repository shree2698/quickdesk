import type { NextConfig } from "next";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load root .env file by traversing up from current directory
let currentDir = __dirname;
while (currentDir) {
  const envPath = path.join(currentDir, ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
  const parentDir = path.dirname(currentDir);
  if (parentDir === currentDir) break;
  currentDir = parentDir;
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
