#! /usr/bin/env node

const prompts = require("prompts");
const { createBranch } = require("./scripts/create-branch");
const { createRelease } = require("./scripts/create-release");
const { createTag } = require("./scripts/create-tag");
const { publishVersion } = require('./scripts/publish-version');

let options = [
    { title: "Create Branch", value: createBranch },
    { title: "Create Release", value: createRelease },
    { title: "Create Tag", value: createTag },
    { title: "Publish package", value: publishVersion },
];

let promptsConfig = [{
    type: 'select',
    name: 'value',
    message: 'Pick an option',
    choices: options,
    initial: 0
}];

(async () => {
    const response = await prompts(promptsConfig);
    let choice = response.value;
    if (!choice) {
        console.error("Please try again!");
        return;
    }
    choice();
})();