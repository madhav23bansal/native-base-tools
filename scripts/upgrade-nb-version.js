#! /usr/bin/env node

const prompts = require("prompts");
var fs = require("fs");
var resolve = require("path").resolve;
var join = require("path").join;
const { spawn, exec, execSync } = require("child_process");
const { createPullRequest } = require("./create-pr");
var lib = resolve("./");
const utils = require("./utils");
const getVersionPath = __dirname + "/get-package-json-version.sh";

const releaseVersionType = "patch";

function getVersion() {
  var ls = spawn("sh", [getVersionPath]);
  ls.stdout.on("data", function (data) {
    packageJsonVersion = `${data}`;
    packageJsonVersion = packageJsonVersion.trim();
  });
  ls.stderr.on("data", (data) => {
    console.log(`stderr: ${data}`);
  });
  ls.on("error", (error) => {
    console.log(`error: ${error.message}`);
  });
  ls.on("close", (code) => {
    console.log("Finished!");
  });
}

let nbVersionQuestion = [
  {
    type: "text",
    name: "value",
    message: `Please enter native-base version`,
    initial: "latest",
  },
];

function bumpVersion(packageJsonVersion, currentReleaseVersionType = "patch") {
  let parsedArray = packageJsonVersion.split(".");
  //TODO: Add condition to check version type in future.
  /**
   * parsedArray[0] Major
   * parsedArray[1] Minor
   * parsedArray[2] Patch
   */
  parsedArray[2] = parseFloat(parsedArray[2]) + 1;
  let final = parsedArray.join(".");
  return final;
}

function updatePackageJsonVersion(path, version) {
  const data = fs.readFileSync(path, {
    encoding: "utf8",
    flag: "r",
  });

  const jsonTemplateData = JSON.parse(data);
  jsonTemplateData.version = version;

  fs.writeFileSync(path, JSON.stringify(jsonTemplateData));
  spawn("npx", ["prettier", "--write", path]);
}

function getVersion(path) {
  const data = fs.readFileSync(path, {
    encoding: "utf8",
    flag: "r",
  });

  const jsonTemplateData = JSON.parse(data);
  return jsonTemplateData.version;
}

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

function createNewBranch(branchName) {
  try {
    execSync(`git checkout -b ${branchName}`);
  } catch (Err) {
    execSync(`git checkout ${branchName}`);
  }
}

async function runYanAdd(nbVersion) {
  let promises = [];
  fs.readdirSync(lib).forEach(function (mod) {
    const packageJsonPath = join(lib, mod + "/package.json");

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

    if (
      mod === "cra-template-nativebase" ||
      mod === "cra-template-nativebase-typescript"
    ) {
      const templateVersion = getVersion(packageJsonPath);
      const bumpedTemplateVersion = bumpVersion(templateVersion);
      updatePackageJsonVersion(packageJsonPath, bumpedTemplateVersion);

      modPath = join(modPath, "template.json");
      const data = fs.readFileSync(modPath, {
        encoding: "utf8",
        flag: "r",
      });

      const jsonTemplateData = JSON.parse(data);
      jsonTemplateData.package.dependencies["native-base"] = nbVersion;

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
      const templateVersion = getVersion(packageJsonPath);
      const bumpedTemplateVersion = bumpVersion(templateVersion);
      updatePackageJsonVersion(packageJsonPath, bumpedTemplateVersion);

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
  });
}

module.exports.upgradeNbVersion = upgradeNbVersion;
