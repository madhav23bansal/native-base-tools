#! /usr/bin/env node

require('dotenv').config();
const { Octokit } = require("@octokit/rest");
const { spawn } = require("child_process");
const prompts = require("prompts");

const octokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_TOKEN });
const getBranchPath = __dirname + "/get-branch.sh";
const getVersionPath = __dirname + "/get-package-json-version.sh";

let version;
let releaseBranch;
let currentBranch;
let packageJsonVersion;
let remoteData;

function createRelease() {
    setRemoteDataAndCheckForEnv();
};

function setRemoteDataAndCheckForEnv() {
    var ls = spawn('git', ['remote', '-v']);

    ls.stdout.on("data", function (data) {
        remoteData = JSON.stringify(`${data}`);
    });
    ls.stderr.on("data", data => {
        console.log(`Switched to a new branch: release/${data}`);
    });
    ls.on("error", error => {
        console.log(`error: ${error.message}`);
    });
    ls.on("close", code => {
        if (remoteData.match(/\@([^)]+)\:/).pop() == "github.com") {
            if (!process.env.GITHUB_PERSONAL_TOKEN) {
                console.error("Please check GITHUB_PERSONAL_TOKEN in your env file");
                return;
            }
            getVersion();
        }
    });
}

function getVersion() {
    var ls = spawn('sh', [getVersionPath]);
    ls.stdout.on("data", function (data) {
        packageJsonVersion = `${data}`;
        packageJsonVersion = packageJsonVersion.trim();
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
    let subOptions = [
        { title: 'Patch', value: 'patch' },
        { title: 'Minor', value: 'minor' },
        { title: 'Major', value: 'major' },
    ];

    let options = [
        { title: 'alpha', value: 'alpha' },
        { title: 'rc', value: 'rc' },
        { title: 'exact', value: 'exact' },
    ];

    let optionsWithoutAlpha = [
        { title: 'rc', value: 'rc' },
        { title: 'exact', value: 'exact' },
    ];

    let promptsConfig = [{
        type: 'select',
        name: 'value',
        message: 'Pick an option',
        choices: options,
        initial: 0
    }];

    let subPromptsConfig = [{
        type: 'select',
        name: 'value',
        message: 'Pick an option',
        choices: subOptions,
        initial: 0
    }];

    let configWithoutAlpha = [{
        type: 'select',
        name: 'value',
        message: 'Pick an option',
        choices: optionsWithoutAlpha,
        initial: 0
    }];

    // let arg = process.argv.slice(3)[0];
    let choice;
    let choice2;

    if (packageJsonVersion.includes('alpha')) {
        const response = await prompts(promptsConfig);
        choice = response.value;
        if (!choice) {
            console.log("Please try again!");
            return;
        }
    } else if (packageJsonVersion.includes('rc')) {
        const response = await prompts(configWithoutAlpha);
        choice = response.value;
        if (!choice) {
            console.log("Please try again");
            return;
        }
    } else {
        const response = await prompts(promptsConfig);
        choice = response.value;
        if (!choice) {
            console.log("Please try again!");
            return;
        }
        const response2 = await prompts(subPromptsConfig);
        choice2 = response2.value;
        if (!choice2) {
            console.log("Please try again!");
            return;
        }
    }

    // options.some(element => {
    //     if (arg == element.value) {
    //         choice = element.value;
    //         return true;
    //     }
    // });
    // if (!choice) {
    //     if (process.argv.slice(3).length > 0) {
    //         console.error("Please pass correct argument or choose from options given below");
    //     }
    //     const response = await prompts(promptsConfig);
    //     choice = response.value;
    // }
    // if (!choice) {
    //     console.error("Please try again!");
    //     return;
    // }

    createVersion(choice, choice2);
}

async function createVersion(choice, choice2) {
    version = parseVersion(choice, choice2);
    releaseBranch = 'release/' + version;
    getCurrentBranch();
}

function getCurrentBranch() {
    var ls = spawn('sh', [getBranchPath]);
    ls.stdout.on("data", function (data) {
        currentBranch = `${data}`;
    });
    ls.stderr.on("data", data => {
        console.log(`stderr: ${data}`);
    });
    ls.on("error", error => {
        console.log(`error: ${error.message}`);
    });
    ls.on("close", code => {
        checkBranch();
    });
}

function checkBranch() {
    currentBranch = currentBranch.trim();
    if (currentBranch == 'development' || currentBranch == "minor" || currentBranch == "patch") {
        bumpVersion();
    } else {
        console.log('\nRelease can only be created from development or minor or patch branch.\nYour current branch is', currentBranch);
    }
}

function bumpVersion() {
    var ls = spawn('yarn', ['version', '--new-version', version]);
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
        createReleaseBranch();
    });
}

function createReleaseBranch() {
    var ls = spawn('git', ['checkout', '-b', releaseBranch]);
    ls.stdout.on("data", function (data) {
        console.log(`${data}`);
    });
    ls.stderr.on("data", data => {
        console.log(`Switched to a new branch: release/${data}`);
    });
    ls.on("error", error => {
        console.log(`error: ${error.message}`);
    });
    ls.on("close", code => {
        checkRemote();
    });
}

function checkRemote() {
    if (remoteData) {
        createPR();
    }
    else {
        console.error("Remote Data cannot be empty");
        return;
    }
}

function createPR() {
    if (remoteData.match(/\@([^)]+)\:/).pop() == "github.com") {
        let remoteSample = remoteData.match(/\:([^)]+)\./).pop();
        let gitVariables = remoteSample.split('/');
        let owner = gitVariables[0].trim();
        let repo = gitVariables[1].trim();
        let prTitle = 'release ' + version;
        let base = 'main';
        let head = releaseBranch;
        pushToGithub(repo, owner, prTitle, base, head);
    } else {
        createPRforGitlab();
    }
}

function pushToGithub(repo, owner, prTitle, base, head) {
    var ls = spawn('git', ['push', 'origin', releaseBranch]);
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
        console.log("Pushed to Github");
        createPRforGithub(repo, owner, prTitle, base, head);
    });
}

function createPRforGithub(repo, owner, title, base, head) {
    octokit.rest.pulls.create({
        owner: owner,
        repo: repo,
        title: title,
        base: base,
        head: head,
    });
    console.log("Created PR!");
}

function createPRforGitlab() {
    var ls = spawn('git', ['push', '-o', 'merge_request.create', '-o', 'merge_request.target=master', 'origin', 'release/' + version]);
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
        console.log(`Created PR!`);
    });
}

// Utils
function parseVersion(choice, choice2) {
    if (choice == 'exact') {
        if (packageJsonVersion.includes('alpha') || packageJsonVersion.includes('rc')) {
            let parsedArray = packageJsonVersion.split('-');
            return parsedArray[0];
        }
        else {
            if (choice2 == 'patch') {
                return parseVersionType(2);
            } else if (choice2 == 'minor') {
                return parseVersionType(1);
            } else if (choice2 == 'major') {
                return parseVersionType(0);
            }
        }
    } else if (choice == 'alpha') {
        if (packageJsonVersion.includes('alpha')) {
            let x = packageJsonVersion.split('.');
            return parseVersionType(x.length - 1);
        } else {
            let x;
            if (choice2 == 'patch') {
                x = parseVersionType(2);
            } else if (choice2 == "minor") {
                x = parseVersionType(1);
            } else if (choice2 == "major") {
                x = parseVersionType(0);
            }
            x = x + '-alpha.0';
            return x;
        }
    } else if (choice == 'rc') {
        if (packageJsonVersion.includes('alpha')) {
            let parsedArray = packageJsonVersion.split('-');
            parsedArray[parsedArray.length - 1] = 'rc.0';
            return parsedArray.join('-');
        }
        else if (packageJsonVersion.includes('rc')) {
            let x = packageJsonVersion.split('.');
            return parseVersionType(x.length - 1);
        }
        else {
            let x;
            if (choice2 == 'patch') {
                x = parseVersionType(2);
            } else if (choice2 == "minor") {
                x = parseVersionType(1);
            } else if (choice2 == "major") {
                x = parseVersionType(0);
            }
            x = x + '-rc.0';
            return x;
        }
    }
}

function parseVersionType(index) {
    let parsedArray = packageJsonVersion.split('.');
    parsedArray[index] = parseFloat(parsedArray[index]) + 1;
    let final = parsedArray.join('.');
    return final;
}

module.exports.createRelease = createRelease;