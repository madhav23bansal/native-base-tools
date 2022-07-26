#! /usr/bin/env node

const prompts = require("prompts");
var fs = require("fs");
var resolve = require("path").resolve;
var join = require("path").join;
const { spawn, exec, execSync } = require("child_process");
const { createPullRequest } = require("./create-pr");
var lib = resolve("./");
const utils = require("./utils");

let nbVersionQuestion = [
  {
    type: "text",
    name: "value",
    message: `Please enter native-base version`,
    initial: "latest",
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
  if (nbVersion === "latest") {
    nbVersion = execSync("npm show native-base version").toString().trim();
  }

  //config --get remote.origin.url
  // var ls = execSync("git", ["config", "--get", `remote.origin.url`]);
  var gitRemoteURL = execSync("git config --get remote.origin.url").toString();

  if (gitRemoteURL.trim() !== utils.gitTemplateRemoteURL) {
    console.error(`Wrong git repo!, ${gitRemoteURL}`);
    return;
  }
  createNewBranch("nb-version-change/" + nbVersion, nbVersion);
  await runYanAdd(nbVersion);
  addChanges();

  return;
}

function createNewBranch(branchName, nbVersion) {
  try {
    execSync(`git checkout -b ${branchName}`);
  } catch (Err) {
    execSync(`git checkout ${branchName}`);
  }
  // return new Promise((resolve, reject) => {
  //   var ls = spawn("git", ["checkout", "-b", `${branchName}`]);

  //   ls.stdout.on("data", function (data) {
  //     console.log(`${data}`.trim());
  //   });
  //   ls.stderr.on("data", (data) => {
  //     console.log(`stderr: ${data}`);
  //   });
  //   ls.on("error", (error) => {
  //     console.log(`error: ${error.message}`);
  //   });
  //   ls.on("close", (code) => {
  //     console.log("Finished!");
  //   });
  // });
}

async function runYanAdd(nbVersion) {
  let promises = [];
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

    // console.log(modPath, "mode path hee yee", lib);

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

      // console.log(jsonTemplateData, "JSON TEMPLATE DATA");

      fs.writeFileSync(modPath, JSON.stringify(jsonTemplateData));

      const promise = new Promise((resolve, reject) => {
        const ls = spawn("npx", ["prettier", "--write", modPath]);
        ls.stdout.on("data", function (data) {
          console.log(`${data}`.trim(), "data");
        });
        ls.stderr.on("data", (data) => {
          console.log(`stderr: getcurrent ${data}`);
        });
        ls.on("error", (error) => {
          console.log(`error: ${error.message}`);
          reject();
        });
        ls.on("close", (code) => {
          console.log("Finished!");
          resolve();
        });
      });
      promises.push(promise);
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
      const promise = new Promise((resolve, reject) => {
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
          reject();
        });
        ls.on("close", (code) => {
          console.log("Finished!");
          resolve();
        });
      });
      promises.push(promise);
    }
  });

  return new Promise((resolve, reject) => {
    Promise.all(promises).then((values) => {
      resolve();
    });
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
