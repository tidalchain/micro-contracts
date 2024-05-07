import { program } from "commander";
import { command as facetCuts } from "./facets";
import { command as verifier } from "./verifier";
const COMMANDS = [facetCuts, verifier];

async function main() {
  const MICRO_HOME = process.env.MICRO_HOME;

  if (!MICRO_HOME) {
    throw new Error("Please set $MICRO_HOME to the root of micro repo!");
  } else {
    process.chdir(MICRO_HOME);
  }
  program.version("0.1.0").name("upgrade-system").description("set of tools for upgrade l1 part of the system");

  for (const command of COMMANDS) {
    program.addCommand(command);
  }
  await program.parseAsync(process.argv);
}

main().catch((err: Error) => {
  console.error("Error:", err.message || err);
  process.exitCode = 1;
});
