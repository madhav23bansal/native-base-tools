#! /usr/bin/env node

const prompts = require("prompts");
const { createBranch } = require("./scripts/create-branch");
const { createRelease } = require("./scripts/create-release");
const { createTag } = require("./scripts/create-tag");
const { publishVersion } = require("./scripts/publish-version");
const { createPullRequest } = require("./scripts/create-pr");
const { upgradeNbVersion } = require("./scripts/upgrade-nb-version");
const {
  publishNativeBaseTemplates,
} = require("./scripts/publish-nb-templates");

let options = [
  { title: "Create Branch", value: createBranch },
  { title: "Create Pull Request", value: createPullRequest },
  { title: "Create Release", value: createRelease },
  { title: "Create Tag", value: createTag },
  { title: "Publish package", value: publishVersion },
  { title: "Upgrade native-base-templates", value: upgradeNbVersion },
  { title: "Publish native-base-templates", value: publishNativeBaseTemplates },
];

let promptsConfig = [
  {
    type: "select",
    name: "value",
    message: "Pick an option",
    choices: options,
    initial: 0,
  },
];

(async () => {
  let arg = require("minimist")(process.argv.slice(2));
  let choice;
  options.some((element) => {
    if (arg.action == element.value.name) {
      choice = element.value;
      return true;
    }
  });
  if (!choice) {
    if (arg.action) {
      console.error(
        "Please pass correct action or choose from options given below"
      );
    }
    const response = await prompts(promptsConfig);
    choice = response.value;
  }
  if (!choice) {
    console.log("Please try again!");
    return;
  }
  choice();
})();
