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
    getVersion();
};

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
    if (!process.env.GITHUB_PERSONAL_TOKEN) {
        console.error("Please check GITHUB_PERSONAL_TOKEN in your env file");
    }

    let options = [
        { title: 'Patch', value: 'patch' },
        { title: 'Minor', value: 'minor' },
        { title: 'Major', value: 'major' },
        { title: 'Custom', value: 'custom' },
    ];

    let promptsConfig = [{
        type: 'select',
        name: 'value',
        message: 'Pick an option',
        choices: options,
        initial: 0
    }];

    const response = await prompts(promptsConfig);
    let choice = response.value;
    if (!choice) {
        console.error("Please try again!");
        return;
    }

    createVersion(choice);
}

async function createVersion(choice) {
    if (choice == 'patch') {
        version = parseVersion(2);
    } else if (choice == 'minor') {
        version = parseVersion(1);
    } else if (choice == 'major') {
        version = parseVersion(0);
    } else {
        let versionQuestion = [{
            type: 'text',
            name: 'value',
            message: `Please enter custom version`
        }];
        const versionFromPrompt = await prompts(versionQuestion);
        let versionFromUser = versionFromPrompt.value;
        if (!versionFromUser) {
            console.error("Please try again!");
            return;
        }
        version = versionFromUser;
    }
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
    if (currentBranch.trim() == 'development' || currentBranch.trim() == "minor" || currentBranch.trim() == "patch") {
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
        createPR();
    });
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
function parseVersion(index) {
    let parsedArray = packageJsonVersion.split('.');
    parsedArray[index] = parseFloat(parsedArray[index]) + 1;
    let final = parsedArray.join('.');
    return final;
}


module.exports.createRelease = createRelease;