import { runOpenClawImportCli } from "./import-openclaw";

runOpenClawImportCli(process.argv.slice(2), { forceDryRun: true })
  .then((code) => {
    process.exit(code);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
