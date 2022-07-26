#! /usr/bin/env node

const prompts = require("prompts");
var fs = require("fs");
var resolve = require("path").resolve;
var join = require("path").join;
const { spawn } = require("child_process");
const { createPullRequest } = require("./create-pr");
var lib = resolve("./");

let nbVersionQuestion = [
  {
    type: "text",
    name: "value",
    message: `Please enter native-base version`,
  },
];

async function upgradeNbVersion() {
  let nbVersion;

  const repsoneForBranchName = await prompts(nbVersionQuestion);
  nbVersion = repsoneForBranchName.value;

  if (!nbVersion) {
    console.error("Please enter native-base version");
    return;
  }
  // runCmd(nbVersion);
  createNewBranch("nb-version-change/" + nbVersion, nbVersion);
  addChanges();
}

function createNewBranch(branchName, nbVersion) {
  var ls = spawn("git", ["checkout", "-b", `${branchName}`]);

  ls.stdout.on("data", function (data) {
    console.log(`${data}`.trim());
  });
  ls.stderr.on("data", (data) => {
    console.log(`stderr: ${data}`);
  });
  ls.on("error", (error) => {
    console.log(`error: ${error.message}`);
  });
  ls.on("close", (code) => {
    runCmd(nbVersion);
    console.log("Finished!");
  });
}

function runCmd(nbVersion) {
  fs.readdirSync(lib).forEach(function (mod) {
    let modPath;

    if (
      mod === "react-native-template-nativebase" ||
      mod === "react-native-template-nativebase-typescript"
    ) {
      modPath = join(lib, mod + "/template");
    } else if (
      mod === "solito-universal-app-template-nativebase" ||
      mod === "solito-universal-app-template-nativebase-typescript"
    ) {
      modPath = join(lib, mod + "/packages/app");
    } else {
      modPath = join(lib, mod);
    }

    console.log(modPath, "mode path hee yee", lib);

    if (
      mod === "cra-template-nativebase" ||
      mod === "cra-template-nativebase-typescript"
    ) {
      // TODO:  Logic to write in template.json file for CRA apps (add "/template.json later in original template")
      modPath = join(modPath, "template.json");
      const data = fs.readFileSync(modPath, {
        encoding: "utf8",
        flag: "r",
      });

      const jsonTemplateData = JSON.parse(data);
      jsonTemplateData.package.dependencies["native-base"] = nbVersion;

      console.log(jsonTemplateData, "JSON TEMPLATE DATA");

      fs.writeFileSync(modPath, JSON.stringify(jsonTemplateData));

      const ls = spawn("npx", ["prettier", "--write", modPath]);
      ls.stdout.on("data", function (data) {
        console.log(`${data}`.trim(), "data");
      });
      ls.stderr.on("data", (data) => {
        console.log(`stderr: getcurrent ${data}`);
      });
      ls.on("error", (error) => {
        console.log(`error: ${error.message}`);
      });
      ls.on("close", (code) => {
        console.log("Finished!");
      });
    } else if (
      mod === "react-native-template-nativebase" ||
      mod === "react-native-template-nativebase-typescript" ||
      mod === "solito-universal-app-template-nativebase" ||
      mod === "solito-universal-app-template-nativebase-typescript" ||
      mod === "nextjs-with-native-base" ||
      mod === "nextjs-with-native-base-typescript" ||
      mod === "expo-nativease" ||
      mod === "expo-nativebase-typescript"
    ) {
      const yarnCmd = `native-base@${nbVersion}`;
      const ls = spawn("yarn", ["add", yarnCmd], {
        cwd: modPath,
      });
      ls.stdout.on("data", function (data) {
        console.log(`${data}`.trim());
      });
      ls.stderr.on("data", (data) => {
        console.log(`stderr: getcurrent ${data}`);
      });
      ls.on("error", (error) => {
        console.log(`error: ${error.message}`);
      });
      ls.on("close", (code) => {
        console.log("Finished!");
      });
    }
  });
}

function addChanges() {
  const commitMessage = "feat: nb version upgrade";
  const ls = spawn("git", ["add", "."]);
  ls.stdout.on("data", function (data) {
    console.log(`${data}`.trim(), "data");
  });
  ls.stderr.on("data", (data) => {
    console.log(`stderr: getcurrent ${data}`);
  });
  ls.on("error", (error) => {
    console.log(`error: ${error.message}`);
  });
  ls.on("close", (code) => {
    commitChanges(commitMessage);
  });
}

function commitChanges(commitMessage) {
  const ls = spawn("git", ["commit", "-m", commitMessage]);
  ls.stdout.on("data", function (data) {
    console.log(`${data}`.trim(), "data");
  });
  ls.stderr.on("data", (data) => {
    console.log(`stderr: getcurrent ${data}`);
  });
  ls.on("error", (error) => {
    console.log(`error: ${error.message}`);
  });
  ls.on("close", (code) => {
    createPullRequest();
    // console.log("FINIESHED TILL PR");
  });
}

module.exports.upgradeNbVersion = upgradeNbVersion;