import { register } from "tsconfig-paths";
import * as path from "path";

register({
  baseUrl: path.resolve(__dirname, ".."),
  paths: {
    "@modules/*": ["src/modules/*"],
    "@shared/*": ["src/shared/*"],
  },
});
