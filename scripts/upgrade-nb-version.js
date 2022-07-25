#! /usr/bin/env node

const prompts = require("prompts");
var fs = require("fs");
var resolve = require("path").resolve;
var join = require("path").join;
const { spawn } = require("child_process");
const { createBranch } = require("./create-branch");
const { createPullRequest } = require("./create-pr");
var lib = resolve(__dirname, "../");

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

  console.log(nbVersion, "@@@");

  if (!nbVersion) {
    console.error("Please enter native-base version");
    return;
  }
  createNewBranch("nb-version-change/" + nbVersion, nbVersion);
}

function createNewBranch(branchName, nbVersion) {
  var ls = spawn("git", ["checkout", "-b", `${branchName}`]);

  ls.stdout.on("data", function (data) {
    console.log(`${data}`);
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
    } else {
      modPath = join(lib, mod);
    }

    if (
      mod === "cra-template-nativebase" ||
      mod === "cra-template-nativebase-typescript" ||
      mod === "package.json"
    ) {
      // TODO:  Logic to write in template.json file for CRA apps (add "/template.json later in original template")
      const data = fs.readFileSync(modPath, { encoding: "utf8", flag: "r" });

      const jsonTemplateData = JSON.parse(data);
      jsonTemplateData.dependencies["prompts"] = nbVersion;

      fs.writeFileSync(modPath, JSON.stringify(jsonTemplateData));

      const ls = spawn("npx", ["prettier", "--write", modPath]);
      ls.stdout.on("data", function (data) {
        console.log(data, "data");
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
    // TODO: UNCOMMENT THIS LINES AFTER TESTING
    //  else if (
    //   mod === "react-native-template-nativebase" ||
    //   mod === "react-native-template-nativebase-typescript"
    // ) {
    //   /**Logic to upgrade native-base inside template --> package.json */
    //   spawn("yarn", ["upgrade", "native-base@", nbVersion], {
    //     cwd: modPath + "/",
    //   });
    // } else {
    //   spawn("yarn", ["upgrade", "native-base@", nbVersion], {
    //     cwd: modPath,
    //   });
    // }
  });
  const ls = spawn("git", ["add", "."]);
  spawn("git", ["commit", "-m", "feat: upgrade nb version"]);
  ls.stdout.on("data", function (data) {
    console.log(data, "data");
  });
  ls.stderr.on("data", (data) => {
    console.log(`stderr: getcurrent ${data}`);
  });
  ls.on("error", (error) => {
    console.log(`error: ${error.message}`);
  });
  ls.on("close", (code) => {
    addChanges();
  });
}

function addChanges() {
  const commitMessage = "feat: nb version upgrade";
  const ls = spawn("git", ["add", "."]);
  ls.stdout.on("data", function (data) {
    console.log(data, "data");
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
    console.log(data, "data");
  });
  ls.stderr.on("data", (data) => {
    console.log(`stderr: getcurrent ${data}`);
  });
  ls.on("error", (error) => {
    console.log(`error: ${error.message}`);
  });
  ls.on("close", (code) => {
    createPullRequest();
  });
}

module.exports.upgradeNbVersion = upgradeNbVersion;
