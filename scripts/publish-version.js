#! /usr/bin/env node

const { spawn } = require("child_process");
const prompts = require("prompts");

const getVersionPath = __dirname + "/get-package-json-version.sh";

let packageJsonVersion;
let options = [
    { title: "Publish npm version", value: 'npm' },
    { title: "Publish vscode extention", value: 'vscode' },
];

let promptsConfig = [{
    type: 'select',
    name: 'value',
    message: 'Pick an option',
    choices: options,
    initial: 0
}];

function publishVersion() {
    getVersion();
};

function getVersion() {
    var ls = spawn('sh', [getVersionPath]);
    ls.stdout.on("data", function (data) {
        packageJsonVersion = `${data}`;
    });
    ls.stderr.on("data", data => {
        console.log(`stderr: ${data}`);
    });
    ls.on("error", error => {
        console.log(`error: ${error.message}`);
    });
    ls.on("close", code => {

        promptQuestions();
    });
}

async function promptQuestions() {
    const response = await prompts(promptsConfig);
    let choice = response.value;

    if (!choice) {
        console.error("Please try again!");
        return;
    }
    publish(choice);
}

function publish(choice) {
    let ls;
    if (choice == 'npm') {
        let tag;
        if (packageJsonVersion.includes('rc')) tag = 'next';
        else if (packageJsonVersion.includes('alpha')) tag = 'alpha';
        else tag = 'latest';

        ls = spawn('yarn', ['publish', '--tag=' + tag, '--new-version=' + packageJsonVersion]);
    }
    else if (choice == "vscode") {
        ls = spawn('npx', ['vsce', 'publish', packageJsonVersion]);
    } else {
        console.error("Something went wrong.");
        return;
    }

    ls.stdout.on("data", function (data) {
        console.log(`${data}`);
    });
    ls.stderr.on("data", data => {
        console.log(`stderr: ${data}`);
    });
    ls.on("error", error => {
        console.log(`error: ${error.message}`);
    });
    ls.on("close", code => {
        console.log("DONE!");
    });
}

module.exports.publishVersion = publishVersion;